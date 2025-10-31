const cron = require('node-cron')
const { settleExpiredBets, getSettlementStats } = require('./betSettlement')
const logger = require('./logger')

/**
 * Initialize the bet settlement scheduler
 * Runs every hour to check for expired bets
 */
function initializeScheduler() {
  console.log('Initializing bet settlement scheduler...')
  
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('Running scheduled bet settlement...')
      const result = await settleExpiredBets()
      logger.info('Scheduled settlement completed', result)
    } catch (error) {
      logger.error('Scheduled settlement failed', error)
    }
  })
  
  // Run settlement stats every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      const stats = await getSettlementStats()
      logger.info('Settlement statistics', stats)
    } catch (error) {
      logger.error('Failed to get settlement stats', error)
    }
  })
  
  console.log('Bet settlement scheduler initialized')
}

/**
 * Manual trigger for bet settlement (useful for testing)
 */
async function triggerSettlement() {
  try {
    console.log('Manually triggering bet settlement...')
    const result = await settleExpiredBets()
    console.log('Manual settlement completed:', result)
    return result
  } catch (error) {
    console.error('Manual settlement failed:', error)
    throw error
  }
}

module.exports = {
  initializeScheduler,
  triggerSettlement
}
