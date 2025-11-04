const axios = require('axios')
const { Op } = require('sequelize')
const config = require('./config')
const GameOdds = require('../models/gameOdds')
const logger = require('./logger')

const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4'

// Supported sports
const SPORTS = [
  'americanfootball_nfl',
  'americanfootball_ncaaf',
  'basketball_nba',
  'mma_mixed_martial_arts'
]

/**
 * Fetch and store odds for a specific sport
 * Fetches odds for events in the next 3 days
 */
async function fetchAndStoreOddsForSport(sport) {
  try {
    const now = new Date()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    
    console.log(`Fetching odds for ${sport}...`)
    
    const apiResponse = await axios.get(`${ODDS_API_BASE_URL}/sports/${sport}/odds`, {
      params: {
        apiKey: config.ODDS_API_KEY,
        regions: 'us',
        markets: 'h2h',
        oddsFormat: 'american',
        dateFormat: 'iso'
      }
    })
    
    const apiOdds = apiResponse.data || []
    let storedCount = 0
    let skippedCount = 0
    
    // Store odds in database (upsert by eventId)
    for (const event of apiOdds) {
      const commenceTime = new Date(event.commence_time)
      
      // Only store events within the next 3 days and in the future
      if (commenceTime >= now && commenceTime <= threeDaysFromNow) {
        await GameOdds.upsert({
          eventId: event.id,
          sport: sport,
          commenceTime: commenceTime,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          eventData: event,
          lastUpdated: now
        }, {
          updateOnDuplicate: ['sport', 'commenceTime', 'homeTeam', 'awayTeam', 'eventData', 'lastUpdated']
        })
        storedCount++
      } else {
        skippedCount++
      }
    }
    
    // Clean up old events (older than now or beyond 3 days)
    const deletedCount = await GameOdds.destroy({
      where: {
        sport: sport,
        [Op.or]: [
          { commenceTime: { [Op.lt]: now } },
          { commenceTime: { [Op.gt]: threeDaysFromNow } }
        ]
      }
    })
    
    console.log(`✓ ${sport}: Stored ${storedCount} events, skipped ${skippedCount}, cleaned ${deletedCount} old events`)
    logger.info(`Odds fetched for ${sport}: ${storedCount} stored, ${deletedCount} cleaned`)
    
    return {
      sport,
      storedCount,
      skippedCount,
      deletedCount,
      remainingRequests: apiResponse.headers['x-requests-remaining'],
      usedRequests: apiResponse.headers['x-requests-used']
    }
  } catch (error) {
    console.error(`Error fetching odds for ${sport}:`, error.response?.data || error.message)
    logger.error(`Failed to fetch odds for ${sport}`, error)
    throw error
  }
}

/**
 * Fetch and store odds for all sports
 * This is the main function called by the scheduler
 */
async function fetchAndStoreAllOdds() {
  try {
    console.log('Starting scheduled odds fetch for next 3 days...')
    const startTime = Date.now()
    
    const results = []
    
    // Fetch odds for all sports in parallel
    const promises = SPORTS.map(sport => 
      fetchAndStoreOddsForSport(sport)
        .then(result => ({ success: true, ...result }))
        .catch(error => ({ 
          success: false, 
          sport, 
          error: error.message 
        }))
    )
    
    const sportResults = await Promise.all(promises)
    
    const duration = Date.now() - startTime
    const successCount = sportResults.filter(r => r.success).length
    const failCount = sportResults.filter(r => !r.success).length
    
    console.log(`Completed odds fetch: ${successCount} succeeded, ${failCount} failed (${duration}ms)`)
    logger.info(`Scheduled odds fetch completed: ${successCount}/${SPORTS.length} sports, ${duration}ms`)
    
    return {
      success: true,
      duration,
      sports: sportResults,
      summary: {
        total: SPORTS.length,
        success: successCount,
        failed: failCount
      }
    }
  } catch (error) {
    console.error('Error in fetchAndStoreAllOdds:', error)
    logger.error('Failed to fetch all odds', error)
    throw error
  }
}

module.exports = {
  fetchAndStoreAllOdds,
  fetchAndStoreOddsForSport,
  SPORTS
}

