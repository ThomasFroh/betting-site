const axios = require('axios')
const oddsRouter = require('express').Router()
const config = require('../utils/config')

const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4'

const americanFootballNFL = 'americanfootball_nfl' // NFL
const americanFootballNCAAF = 'americanfootball_ncaaf' // NCAAF
const basketballNBA = 'basketball_nba' // NBA
const mmaUFC = 'mma_mixed_martial_arts' // UFC

// Get list of in-season sports
oddsRouter.get('/sports', async (request, response) => {
  try {
    const apiResponse = await axios.get(`${ODDS_API_BASE_URL}/sports`, {
      params: {
        apiKey: config.ODDS_API_KEY
      }
    })
    
    response.json(apiResponse.data)
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
oddsRouter.get('/:sport/odds', async (request, response) => {
  try {
    const { sport } = request.params
    const { 
      regions = 'us', 
    //   markets = 'h2h,spreads,totals', 
      markets = 'h2h',
      oddsFormat = 'american',
      dateFormat = 'iso'
    } = request.query

    const apiResponse = await axios.get(`${ODDS_API_BASE_URL}/sports/${sport}/odds`, {
      params: {
        apiKey: config.ODDS_API_KEY,
        regions,
        markets,
        oddsFormat,
        dateFormat
      }
    })
    
    // Return the odds data
    response.json({
      data: apiResponse.data,
      remainingRequests: apiResponse.headers['x-requests-remaining'],
      usedRequests: apiResponse.headers['x-requests-used']
    })
  } catch (error) {
    console.error('Error fetching odds:', error.response?.data || error.message)
    response.status(500).json({ 
      error: 'Failed to fetch odds',
      details: error.response?.data || error.message
    })
  }
})

// Get odds for a specific event
oddsRouter.get('/events/:eventId', async (request, response) => {
  try {
    const { eventId } = request.params
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