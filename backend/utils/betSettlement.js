const Bet = require('../models/bet')
const User = require('../models/user')
const { Op } = require('sequelize')

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
    
    // Process each event's bets
    for (const [eventId, bets] of Object.entries(betsByEvent)) {
      console.log(`Processing ${bets.length} bets for event ${eventId}`)
      
      // For now, we'll mark all expired bets as lost
      // TODO: In a real system, you'd integrate with a sports data API to get actual results
      const result = await processEventBets(eventId, bets, 'lost') // Default to lost for expired events
      
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

module.exports = {
  settleExpiredBets,
  processEventBets,
  getSettlementStats,
  settleEventManually
}
