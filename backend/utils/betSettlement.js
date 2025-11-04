const Bet = require('../models/bet')
const User = require('../models/user')
const { Op } = require('sequelize')
const axios = require('axios')
const config = require('./config')

const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4'

/**
 * Extract winner from event data with scores
 * @param {Object} eventData - Event data from The Odds API
 * @returns {string|null} 'home_win', 'away_win', 'draw', or null if scores unavailable
 */
function extractWinnerFromScores(eventData) {
  if (!eventData.scores || !Array.isArray(eventData.scores) || eventData.scores.length === 0) {
    return null
  }

  const scores = eventData.scores
  const homeScore = scores.find(s => s.name === eventData.home_team)?.score
  const awayScore = scores.find(s => s.name === eventData.away_team)?.score

  // Check if scores are valid numbers
  if (homeScore !== null && homeScore !== undefined && 
      awayScore !== null && awayScore !== undefined) {
    if (homeScore > awayScore) return 'home_win'
    if (awayScore > homeScore) return 'away_win'
    return 'draw'
  }

  return null
}

/**
 * Automatically settle all bets for events that have ended
 * This function should be called periodically (e.g., every hour)
 */
async function settleExpiredBets() {
  try {
    console.log('Starting automatic bet settlement...')
    
    // Find all pending bets for events that have ended
    const expiredBets = await Bet.findAll({
      where: {
        status: 'pending',
        eventDate: {
          [Op.lt]: new Date() // Event date is in the past
        }
      }
    })
    
    if (expiredBets.length === 0) {
      console.log('No expired bets found')
      return { settled: 0, message: 'No expired bets found' }
    }
    
    console.log(`Found ${expiredBets.length} expired bets to settle`)
    
    // Group bets by event for batch processing
    const betsByEvent = {}
    expiredBets.forEach(bet => {
      if (!betsByEvent[bet.eventId]) {
        betsByEvent[bet.eventId] = []
      }
      betsByEvent[bet.eventId].push(bet)
    })
    
    const settlementResults = []
    let totalSettled = 0
    let totalPayouts = 0
    
    // Group events by sport for batch score fetching
    const eventsBySport = {}
    for (const [eventId, bets] of Object.entries(betsByEvent)) {
      const sport = bets[0].sport
      if (!eventsBySport[sport]) {
        eventsBySport[sport] = []
      }
      eventsBySport[sport].push({ eventId, bets })
    }
    
    // Fetch scores in batches by sport (more efficient)
    const eventResults = {}
    for (const [sport, events] of Object.entries(eventsBySport)) {
      const eventIds = events.map(e => e.eventId)
      console.log(`Fetching scores for ${eventIds.length} ${sport} events...`)
      
      try {
        const batchResults = await fetchScoresBatch(eventIds, sport)
        Object.assign(eventResults, batchResults)
      } catch (error) {
        console.error(`Error fetching batch scores for ${sport}:`, error.message)
      }
    }
    
    // Process each event's bets
    for (const [eventId, bets] of Object.entries(betsByEvent)) {
      console.log(`Processing ${bets.length} bets for event ${eventId}`)
      
      // Get result from batch fetch
      const eventResult = eventResults[eventId]
      
      // If we couldn't determine the result automatically, skip this event
      // It will need manual settlement or can be retried later
      if (!eventResult) {
        console.log(`Could not determine result for event ${eventId} - skipping automatic settlement`)
        settlementResults.push({
          eventId,
          settledBets: 0,
          totalPayouts: 0,
          skipped: true,
          reason: 'Result not available from API'
        })
        continue
      }
      
      // Process bets with the determined result
      const result = await processEventBets(eventId, bets, eventResult)
      result.determinedResult = eventResult
      
      settlementResults.push(result)
      totalSettled += result.settledBets
      totalPayouts += result.totalPayouts
    }
    
    console.log(`Settlement complete: ${totalSettled} bets settled, $${totalPayouts.toFixed(2)} in payouts`)
    
    return {
      settled: totalSettled,
      totalPayouts: totalPayouts,
      results: settlementResults,
      message: `Settled ${totalSettled} expired bets`
    }
  } catch (error) {
    console.error('Error in automatic bet settlement:', error)
    throw error
  }
}

/**
 * Process bets for a specific event with a given result
 * @param {string} eventId - The event ID
 * @param {Array} bets - Array of bet objects
 * @param {string} result - 'home_win' or 'away_win'
 */
async function processEventBets(eventId, bets, result) {
  const settlementResults = []
  let totalPayouts = 0
  
  for (const bet of bets) {
    const won = bet.betType === result
    const newStatus = won ? 'won' : 'lost'
    
    // Update bet status
    await bet.update({
      status: newStatus,
      settledAt: new Date()
    })
    
    if (won) {
      // Process payout
      const user = await User.findByPk(bet.userId)
      await user.update({
        balance: user.balance + bet.potentialPayout
      })
      totalPayouts += bet.potentialPayout
    }
    
    settlementResults.push({
      betId: bet.id,
      userId: bet.userId,
      betType: bet.betType,
      result: newStatus,
      payout: won ? bet.potentialPayout : 0
    })
  }
  
  return {
    eventId,
    settledBets: bets.length,
    totalPayouts: totalPayouts,
    results: settlementResults
  }
}

/**
 * Get settlement statistics
 */
async function getSettlementStats() {
  try {
    const stats = await Bet.findAll({
      attributes: [
        'status',
        [Bet.sequelize.fn('COUNT', Bet.sequelize.col('id')), 'count'],
        [Bet.sequelize.fn('SUM', Bet.sequelize.col('betAmount')), 'totalBetAmount'],
        [Bet.sequelize.fn('SUM', Bet.sequelize.col('potentialPayout')), 'totalPotentialPayout']
      ],
      group: ['status'],
      raw: true
    })
    
    const pendingBets = await Bet.count({
      where: {
        status: 'pending',
        eventDate: {
          [Op.lt]: new Date()
        }
      }
    })
    
    return {
      statusBreakdown: stats,
      expiredPendingBets: pendingBets
    }
  } catch (error) {
    console.error('Error getting settlement stats:', error)
    throw error
  }
}

/**
 * Manually settle a specific event with a result
 * @param {string} eventId - The event ID
 * @param {string} result - 'home_win' or 'away_win'
 */
async function settleEventManually(eventId, result) {
  try {
    const pendingBets = await Bet.findAll({
      where: {
        eventId: eventId,
        status: 'pending'
      }
    })
    
    if (pendingBets.length === 0) {
      return { settled: 0, message: 'No pending bets found for this event' }
    }
    
    const result_data = await processEventBets(eventId, pendingBets, result)
    
    return {
      settled: result_data.settledBets,
      totalPayouts: result_data.totalPayouts,
      results: result_data.results,
      message: `Settled ${result_data.settledBets} bets for event ${eventId}`
    }
  } catch (error) {
    console.error('Error manually settling event:', error)
    throw error
  }
}

/**
 * Fetch scores for multiple events from The Odds API scores endpoint (batch processing)
 * @param {Array<string>} eventIds - Array of event IDs from The Odds API
 * @param {string} sport - The sport key
 * @returns {Promise<Object>} Map of eventId to result ('home_win', 'away_win', or null)
 */
async function fetchScoresBatch(eventIds, sport) {
  const results = {}
  
  if (!eventIds || eventIds.length === 0) {
    return results
  }

  try {
    // The Odds API scores endpoint accepts comma-separated event IDs
    const eventIdsString = eventIds.join(',')
    
    const response = await axios.get(`${ODDS_API_BASE_URL}/sports/${sport}/scores`, {
      params: {
        apiKey: config.ODDS_API_KEY,
        eventIds: eventIdsString,
        dateFormat: 'iso',
        daysFrom: 1,
      },
      timeout: 10000
    })

    const scoresData = response.data

    if (!scoresData || !Array.isArray(scoresData)) {
      return results
    }

    // Process each event in the response
    for (const eventData of scoresData) {
      const eventId = eventData.id
      const winner = extractWinnerFromScores(eventData)
      if (winner) {
        results[eventId] = winner
      }
    }
  } catch (error) {
    console.error(`Error fetching batch scores for sport ${sport}:`, error.response?.data || error.message)
  }

  return results
}

module.exports = {
  settleExpiredBets,
  processEventBets,
  getSettlementStats,
  settleEventManually,
  fetchScoresBatch
}
