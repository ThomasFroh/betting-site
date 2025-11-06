const axios = require('axios')
const { Op } = require('sequelize')
const oddsRouter = require('express').Router()
const config = require('../utils/config')
const GameOdds = require('../models/gameOdds')
const { isValidSport, isValidEventId } = require('../utils/validation')

const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4'

// Get list of in-season sports
oddsRouter.get('/sports', async (request, response) => {
  try {
    const apiResponse = await axios.get(`${ODDS_API_BASE_URL}/sports`, {
      params: {
        apiKey: config.ODDS_API_KEY
      }
    })
    
    response.json({
      data: apiResponse.data,
      remainingRequests: apiResponse.headers['x-requests-remaining'],
      usedRequests: apiResponse.headers['x-requests-used']
    })
  } catch (error) {
    console.error('Error fetching sports:', error.response?.data || error.message)
    response.status(500).json({ 
      error: 'Failed to fetch sports',
      details: error.response?.data || error.message
    })
  }
})

// Get odds for a specific sport
// Example: /api/odds/americanfootball_nfl/odds?regions=us&markets=h2h
// Now only reads from database (odds are fetched by scheduled job)
oddsRouter.get('/:sport/odds', async (request, response) => {
  try {
    const { sport } = request.params
    
    // Validate sport parameter
    if (!isValidSport(sport)) {
      return response.status(400).json({ 
        error: 'Invalid sport. Allowed sports: americanfootball_nfl, americanfootball_ncaaf, basketball_nba, mma_mixed_martial_arts' 
      })
    }
    
    const now = new Date()
    const sixDaysFromNow = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000)

    // Fetch odds from database only (filtered by commenceTime >= now and <= 6 days)
    const storedOdds = await GameOdds.findAll({
      where: {
        sport: sport,
        commenceTime: {
          [Op.gte]: now, // Only future events
          [Op.lte]: sixDaysFromNow // Within next 6 days
        }
      },
      order: [['commenceTime', 'ASC']]
    })

    const oddsData = storedOdds.map(odd => odd.eventData)
    
    console.log(`Returning ${oddsData.length} stored odds for ${sport} (from database)`)
    
    // Return the odds data (already filtered by commenceTime >= now and <= 6 days)
    response.json({
      data: oddsData,
      remainingRequests: null, // Not available when reading from DB
      usedRequests: null
    })
  } catch (error) {
    console.error('Error fetching odds from database:', error.message)
    response.status(500).json({ 
      error: 'Failed to fetch odds',
      details: error.message
    })
  }
})

// Get odds for a specific event
oddsRouter.get('/events/:eventId', async (request, response) => {
  try {
    const { eventId } = request.params
    
    // Validate eventId
    if (!isValidEventId(eventId)) {
      return response.status(400).json({ 
        error: 'Invalid event ID format' 
      })
    }
    
    const { 
      regions = 'us', 
      markets = 'h2h,spreads', 
      oddsFormat = 'american',
      dateFormat = 'iso'
    } = request.query

    const apiResponse = await axios.get(`${ODDS_API_BASE_URL}/sports/*/events/${eventId}/odds`, {
      params: {
        apiKey: config.ODDS_API_KEY,
        regions,
        markets,
        oddsFormat,
        dateFormat
      }
    })
    
    response.json(apiResponse.data)
  } catch (error) {
    console.error('Error fetching event odds:', error.response?.data || error.message)
    response.status(500).json({ 
      error: 'Failed to fetch event odds',
      details: error.response?.data || error.message
    })
  }
})

module.exports = oddsRouter