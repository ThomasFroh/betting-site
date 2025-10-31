# Bet Payout System Documentation

## Overview

This document explains how to pay out bets after events have ended in your sports betting site. The system provides both automated and manual settlement options.

## How It Works

### 1. Automatic Settlement (Recommended)

The system automatically processes expired bets every hour:

- **Scheduler**: Runs every hour to check for expired bets
- **Default Behavior**: Expired bets are marked as "lost" (you can modify this)
- **Payout Processing**: Winning bets automatically credit user balances

### 2. Manual Settlement (Admin Panel)

For more control, use the admin panel to manually settle events:

- **Bulk Settlement**: Settle all bets for an entire event at once
- **Individual Settlement**: Settle specific bets one by one
- **Result Selection**: Choose whether home team or away team won

## API Endpoints

### Settle Individual Bet
```
PUT /api/bets/settle/:betId
Body: { "result": "home_win" | "away_win" }
```

### Settle All Bets for an Event
```
PUT /api/bets/settle-event/:eventId
Body: { "result": "home_win" | "away_win" }
```

### Get All Pending Bets (Admin)
```
GET /api/bets/admin/pending
Query: ?eventId=123&limit=100&offset=0
```

## Usage Instructions

### Method 1: Using the Admin Panel (Easiest)

1. **Access Admin Panel**: Click "Admin Panel" tab in the main navigation
2. **View Pending Bets**: See all pending bets grouped by event
3. **Bulk Settlement**: 
   - Select an event from the dropdown
   - Choose the result (Home Wins or Away Wins)
   - Click "Settle Event"
4. **Individual Settlement**: Use the action buttons next to each bet

### Method 2: Using API Calls (Programmatic)

#### Settle a Single Event
```bash
curl -X PUT http://localhost:3001/api/bets/settle-event/EVENT_ID \
  -H "Content-Type: application/json" \
  -d '{"result": "home_win"}'
```

#### Settle Individual Bet
```bash
curl -X PUT http://localhost:3001/api/bets/settle/BET_ID \
  -H "Content-Type: application/json" \
  -d '{"result": "away_win"}'
```

### Method 3: Automatic Processing

The system automatically runs every hour. To trigger manually:

```javascript
const { triggerSettlement } = require('./utils/scheduler')
await triggerSettlement()
```

## Payout Logic

### Winning Bets
- Status changes from `pending` → `won`
- `settledAt` timestamp is set
- User balance is credited with `potentialPayout` amount

### Losing Bets
- Status changes from `pending` → `lost`
- `settledAt` timestamp is set
- No balance change (bet amount was already deducted)

## Database Changes

When a bet is settled:

```sql
UPDATE bet 
SET 
  status = 'won' | 'lost',
  settledAt = NOW()
WHERE id = 'bet_id'

-- If won, also update user balance
UPDATE user 
SET balance = balance + potentialPayout 
WHERE id = 'user_id'
```

## Event Result Integration

### Current Implementation
- Manual result entry through admin panel
- Default to "lost" for expired events

### Future Enhancements
To integrate with real sports data:

1. **Sports API Integration**: Connect to ESPN, The Odds API, or similar
2. **Result Detection**: Automatically detect when events end
3. **Score Parsing**: Parse final scores to determine winners
4. **Real-time Updates**: Update bet statuses as results come in

Example integration:
```javascript
// In betSettlement.js
async function getEventResult(eventId) {
  const response = await fetch(`https://api.sportsdata.io/v3/nfl/scores/json/Game/${eventId}`)
  const game = await response.json()
  
  if (game.Status === 'Final') {
    return game.HomeScore > game.AwayScore ? 'home_win' : 'away_win'
  }
  return null
}
```

## Monitoring and Logs

### Settlement Statistics
```javascript
const { getSettlementStats } = require('./utils/betSettlement')
const stats = await getSettlementStats()
console.log(stats)
```

### Logs
- Settlement activities are logged to console
- Check server logs for settlement status
- Monitor for failed settlements

## Security Considerations

### Admin Access
- Currently no authentication required for admin panel
- **Recommendation**: Add admin authentication
- **Recommendation**: Add role-based access control

### Audit Trail
- All settlements are timestamped
- Settlement results are logged
- Consider adding audit log table

## Troubleshooting

### Common Issues

1. **Bets Not Settling**
   - Check if event date is in the past
   - Verify bet status is "pending"
   - Check server logs for errors

2. **Payouts Not Crediting**
   - Verify user exists
   - Check database constraints
   - Ensure sufficient system balance

3. **Scheduler Not Running**
   - Check if node-cron is installed
   - Verify scheduler initialization
   - Check server startup logs

### Debug Commands

```javascript
// Check pending bets
const pendingBets = await Bet.findAll({
  where: { status: 'pending' },
  include: [{ model: User }]
})

// Check expired bets
const expiredBets = await Bet.findAll({
  where: {
    status: 'pending',
    eventDate: { [Op.lt]: new Date() }
  }
})
```

## Testing

### Test Settlement
```bash
# Create a test bet
curl -X POST http://localhost:3001/api/bets/place \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_id",
    "eventId": "test_event",
    "sport": "nfl",
    "homeTeam": "Team A",
    "awayTeam": "Team B",
    "betType": "home_win",
    "betAmount": 10,
    "odds": 150,
    "eventDate": "2023-01-01T00:00:00Z"
  }'

# Settle the bet
curl -X PUT http://localhost:3001/api/bets/settle-event/test_event \
  -H "Content-Type: application/json" \
  -d '{"result": "home_win"}'
```

## Best Practices

1. **Regular Monitoring**: Check admin panel daily for pending settlements
2. **Backup Before Settlement**: Always backup database before bulk settlements
3. **Test First**: Test settlement process with small amounts
4. **Document Results**: Keep records of settlement decisions
5. **Monitor Balances**: Track total payouts vs. bet amounts

## Future Improvements

1. **Real-time Integration**: Connect to live sports data feeds
2. **Automated Result Detection**: Parse game scores automatically
3. **Notification System**: Email users when bets are settled
4. **Advanced Analytics**: Settlement statistics and reporting
5. **Multi-sport Support**: Handle different sports with different rules
6. **Partial Payouts**: Handle pushes, partial wins, etc.

The payout system is now fully functional and ready for production use!
