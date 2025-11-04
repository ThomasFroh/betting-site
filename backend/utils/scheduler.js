const cron = require('node-cron')
const { settleExpiredBets, getSettlementStats } = require('./betSettlement')
const { fetchAndStoreAllOdds } = require('./oddsFetcher')
const logger = require('./logger')

/**
 * Initialize the bet settlement scheduler
 * Runs every hour to check for expired bets
 */
function initializeScheduler() {
  console.log('Initializing schedulers...')
  
  // ===== Odds Fetching Scheduler =====
  // Fetch odds for next 3 days at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log(`Running scheduled odds fetch at ${new Date().toISOString()}...`)
      const result = await fetchAndStoreAllOdds()
      logger.info(`Scheduled odds fetch completed`, result)
    } catch (error) {
      logger.error(`Scheduled odds fetch failed`, error)
    }
  })
  
  // Also fetch immediately on startup
  fetchAndStoreAllOdds()
    .then(result => {
      console.log('Initial odds fetch completed on startup')
      logger.info('Initial odds fetch on startup', result)
    })
    .catch(error => {
      console.error('Initial odds fetch failed on startup:', error)
      logger.error('Initial odds fetch failed on startup', error)
    })
  
  // ===== Bet Settlement Scheduler =====
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
  
  console.log('All schedulers initialized')
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

/**
 * Manual trigger for odds fetch (useful for testing)
 */
async function triggerOddsFetch() {
  try {
    console.log('Manually triggering odds fetch...')
    const result = await fetchAndStoreAllOdds()
    console.log('Manual odds fetch completed:', result)
    return result
  } catch (error) {
    console.error('Manual odds fetch failed:', error)
    throw error
  }
}

module.exports = {
  initializeScheduler,
  triggerSettlement,
  triggerOddsFetch
}
