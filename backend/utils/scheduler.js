const cron = require('node-cron')
const { settleExpiredBets, getSettlementStats } = require('./betSettlement')
const logger = require('./logger')

/**
 * Initialize the bet settlement scheduler
 * Runs every hour to check for expired bets
 */
function initializeScheduler() {
  console.log('Initializing bet settlement scheduler...')
  
  // Run every hour at minute 0 from 7 pm to 1 am (19:00-23:00, 00:00-01:00)
  cron.schedule('0 19-23,0-1 * * *', async () => {
    try {
      console.log(`Running scheduled bet settlement for ${Date.now()}...`)
      const result = await settleExpiredBets()
      logger.info(`Scheduled settlement completed for ${Date.now()}`, result)
    } catch (error) {
      logger.error(`Scheduled settlement failed for ${Date.now()}`, error)
    }
  })
  
  // Run settlement stats only at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    try {
      const stats = await getSettlementStats()
      logger.info(`Settlement statistics for ${Date.now()}`, stats)
    } catch (error) {
      logger.error(`Failed to get settlement stats for ${Date.now()}`, error)
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
