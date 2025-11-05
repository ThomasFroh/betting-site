const Bet = require('../models/bet')
const User = require('../models/user')
const GameOdds = require('../models/gameOdds')
const { Op } = require('sequelize')
const { requireAdmin, requireAuth } = require('../utils/adminAuth')
const {
  isValidUUID,
  validateInteger,
  isValidBetStatus,
  isValidBetType,
  isValidEventId
} = require('../utils/validation')

const betRouter = require('express').Router()

/**
 * Helper function to verify user owns the resource
 * Returns true if userId matches authenticated user, false otherwise
 */
const verifyUserOwnership = (userId, authenticatedUserId) => {
  return userId === authenticatedUserId
}

// Get user's betting history
betRouter.get('/history/:userId', requireAuth, async (request, response) => {
  try {
    const { userId } = request.params
    const { status, limit = 50, offset = 0 } = request.query
    
    // Validate userId
    if (!isValidUUID(userId)) {
      return response.status(400).json({ 
        error: 'Invalid user ID format' 
      })
    }
    
    // Verify user can only access their own data
    if (!verifyUserOwnership(userId, request.user.id)) {
      return response.status(403).json({ 
        error: 'Access denied. You can only access your own betting history.' 
      })
    }
    
    // Validate and sanitize query parameters
    const validatedLimit = validateInteger(limit, 1, 100) || 50
    const validatedOffset = validateInteger(offset, 0, 10000) || 0
    
    const whereClause = { userId: request.user.id } // Use authenticated user ID
    // Validate status against allowed values
    if (status && status !== 'all') {
      if (!isValidBetStatus(status)) {
        return response.status(400).json({ 
          error: 'Invalid status value' 
        })
      }
      whereClause.status = status
    }
    
    const bets = await Bet.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: validatedLimit,
      offset: validatedOffset
    })
    
    response.json({
      data: bets.rows,
      total: bets.count,
      hasMore: (validatedOffset + validatedLimit) < bets.count
    })
  } catch (error) {
    console.error('Error fetching betting history:', error)
    response.status(500).json({ 
      error: 'Failed to fetch betting history',
      details: error.message
    })
  }
})

// Get user's current balance
betRouter.get('/balance/:userId', requireAuth, async (request, response) => {
  try {
    const { userId } = request.params
    
    // Validate userId
    if (!isValidUUID(userId)) {
      return response.status(400).json({ 
        error: 'Invalid user ID format' 
      })
    }
    
    // Verify user can only access their own balance
    if (!verifyUserOwnership(userId, request.user.id)) {
      return response.status(403).json({ 
        error: 'Access denied. You can only access your own balance.' 
      })
    }
    
    const user = await User.findByPk(request.user.id) // Use authenticated user ID
    
    if (!user) {
      return response.status(404).json({ error: 'User not found' })
    }
    
    response.json({ balance: user.balance })
  } catch (error) {
    console.error('Error fetching balance:', error)
    response.status(500).json({ 
      error: 'Failed to fetch balance',
      details: error.message
    })
  }
})

// Place a new bet
betRouter.post('/place', requireAuth, async (request, response) => {
  try {
    const {
      userId,
      eventId,
      sport,
      homeTeam,
      awayTeam,
      betType,
      betAmount,
      odds,
      eventDate
    } = request.body
    
    // Validate required fields (userId is now optional since we use authenticated user)
    if (!eventId || !sport || !homeTeam || !awayTeam || !betType || !betAmount || !odds || !eventDate) {
      return response.status(400).json({ 
        error: 'Missing required fields' 
      })
    }
    
    // Use authenticated user ID instead of request body userId
    const authenticatedUserId = request.user.id
    
    // If userId is provided in body, verify it matches authenticated user
    if (userId && userId !== authenticatedUserId) {
      return response.status(403).json({ 
        error: 'Access denied. You can only place bets for your own account.' 
      })
    }
    
    if (!isValidEventId(eventId)) {
      return response.status(400).json({ 
        error: 'Invalid event ID format' 
      })
    }
    
    // Validate bet type
    if (!isValidBetType(betType)) {
      return response.status(400).json({ 
        error: 'Invalid bet type' 
      })
    }
    
    // Validate bet amount
    const amount = parseFloat(betAmount)
    if (isNaN(amount) || amount <= 0) {
      return response.status(400).json({ 
        error: 'Bet amount must be a positive number' 
      })
    }
    
    // Validate odds is a number
    const oddsNum = parseInt(odds, 10)
    if (isNaN(oddsNum)) {
      return response.status(400).json({ 
        error: 'Invalid odds format' 
      })
    }
    
    // Get user and check balance (use authenticated user ID)
    const user = await User.findByPk(authenticatedUserId)
    if (!user) {
      return response.status(404).json({ error: 'User not found' })
    }
    
    const currentBalance = parseFloat(user.balance) || 0
    
    if (currentBalance < amount) {
      return response.status(400).json({ 
        error: 'Insufficient balance' 
      })
    }
    
    // Validate odds against stored odds in database
    const gameOdds = await GameOdds.findOne({
      where: { eventId: eventId }
    })
    
    if (!gameOdds) {
      return response.status(404).json({ 
        error: 'Event not found or odds not available' 
      })
    }
    
    // Check if event has already started
    const commenceTime = new Date(gameOdds.commenceTime)
    if (commenceTime <= new Date()) {
      return response.status(400).json({ 
        error: 'Cannot place bet on event that has already started' 
      })
    }
    
    // Validate team names match stored data
    if (gameOdds.homeTeam !== homeTeam || gameOdds.awayTeam !== awayTeam) {
      return response.status(400).json({ 
        error: 'Team names do not match event data' 
      })
    }
    
    // Validate sport matches
    if (gameOdds.sport !== sport) {
      return response.status(400).json({ 
        error: 'Sport does not match event data' 
      })
    }
    
    // Extract actual odds from stored event data
    const eventData = gameOdds.eventData
    const bookmaker = eventData.bookmakers?.[0]
    const h2hMarket = bookmaker?.markets?.find(m => m.key === 'h2h')
    
    if (!h2hMarket || !h2hMarket.outcomes) {
      return response.status(400).json({ 
        error: 'Odds data not available for this event' 
      })
    }
    
    // Determine which team the bet is for
    const targetTeam = betType === 'home_win' ? homeTeam : awayTeam
    const actualOutcome = h2hMarket.outcomes.find(o => o.name === targetTeam)
    
    if (!actualOutcome) {
      return response.status(400).json({ 
        error: 'Could not find odds for selected team' 
      })
    }
    
    const actualOdds = actualOutcome.price
    
    // Validate that submitted odds match stored odds
    if (oddsNum !== parseInt(actualOdds, 10)) {
      return response.status(400).json({ 
        error: 'Odds mismatch. The odds for this event have changed. Please refresh and try again.' 
      })
    }
    
    // Calculate potential payout using validated odds
    let potentialPayout
    if (actualOdds > 0) {
      // Positive odds: payout = betAmount + (betAmount * odds / 100)
      potentialPayout = amount + (amount * actualOdds / 100)
    } else {
      // Negative odds: payout = betAmount + (betAmount * 100 / |odds|)
      potentialPayout = amount + (amount * 100 / Math.abs(actualOdds))
    }
    
    // Create the bet (use authenticated user ID and validated values from database)
    const bet = await Bet.create({
      userId: authenticatedUserId, // Use authenticated user ID, not request body
      eventId,
      sport: gameOdds.sport, // Use validated sport from database
      homeTeam: gameOdds.homeTeam, // Use validated team names from database
      awayTeam: gameOdds.awayTeam,
      betType,
      betAmount: amount,
      odds: actualOdds, // Use validated odds from database
      potentialPayout,
      eventDate: commenceTime // Use commenceTime from GameOdds
    })
    
    // Deduct bet amount from user balance
    const newBalance = currentBalance - amount
    await user.update({
      balance: newBalance
    })
    
    response.status(201).json({
      data: bet,
      newBalance: newBalance
    })
  } catch (error) {
    console.error('Error placing bet:', error)
    response.status(500).json({ 
      error: 'Failed to place bet',
      details: error.message
    })
  }
})

// Cancel a pending bet
betRouter.put('/cancel/:betId', requireAuth, async (request, response) => {
  try {
    const { betId } = request.params
    
    // Validate betId
    if (!isValidUUID(betId)) {
      return response.status(400).json({ 
        error: 'Invalid bet ID format' 
      })
    }
    
    // Use authenticated user ID
    const authenticatedUserId = request.user.id
    
    const bet = await Bet.findOne({
      where: {
        id: betId,
        userId: authenticatedUserId, // Only find bets belonging to authenticated user
        status: 'pending'
      }
    })
    
    if (!bet) {
      return response.status(404).json({ 
        error: 'Bet not found or cannot be cancelled' 
      })
    }
    
    // Check if event has already started
    if (new Date() >= new Date(bet.eventDate)) {
      return response.status(400).json({ 
        error: 'Cannot cancel bet after event has started' 
      })
    }
    
    // Refund the bet amount (use authenticated user)
    const user = await User.findByPk(authenticatedUserId)
    const currentBalance = parseFloat(user.balance) || 0
    const refundAmount = parseFloat(bet.betAmount) || 0
    const newBalance = currentBalance + refundAmount
    
    await user.update({
      balance: newBalance
    })
    
    // Update bet status
    await bet.update({
      status: 'cancelled',
      settledAt: new Date()
    })
    
    response.json({
      data: bet,
      newBalance: newBalance
    })
  } catch (error) {
    console.error('Error cancelling bet:', error)
    response.status(500).json({ 
      error: 'Failed to cancel bet',
      details: error.message
    })
  }
})

// Get pending bets for a user
betRouter.get('/pending/:userId', requireAuth, async (request, response) => {
  try {
    const { userId } = request.params
    
    // Validate userId
    if (!isValidUUID(userId)) {
      return response.status(400).json({ 
        error: 'Invalid user ID format' 
      })
    }
    
    // Verify user can only access their own pending bets
    if (!verifyUserOwnership(userId, request.user.id)) {
      return response.status(403).json({ 
        error: 'Access denied. You can only access your own pending bets.' 
      })
    }
    
    const pendingBets = await Bet.findAll({
      where: {
        userId: request.user.id, // Use authenticated user ID
        status: 'pending'
      },
      order: [['eventDate', 'ASC']]
    })
    
    response.json({ data: pendingBets })
  } catch (error) {
    console.error('Error fetching pending bets:', error)
    response.status(500).json({ 
      error: 'Failed to fetch pending bets',
      details: error.message
    })
  }
})

// Settle a bet (mark as won or lost and process payout)
betRouter.put('/settle/:betId', requireAdmin, async (request, response) => {
  try {
    const { betId } = request.params
    const { result } = request.body // 'home_win' or 'away_win'
    
    // Validate betId
    if (!isValidUUID(betId)) {
      return response.status(400).json({ 
        error: 'Invalid bet ID format' 
      })
    }
    
    // Validate result
    if (!result || !isValidBetType(result)) {
      return response.status(400).json({ 
        error: 'Invalid result. Must be "home_win" or "away_win"' 
      })
    }
    
    const bet = await Bet.findByPk(betId)
    if (!bet) {
      return response.status(404).json({ error: 'Bet not found' })
    }
    
    if (bet.status !== 'pending') {
      return response.status(400).json({ 
        error: 'Bet has already been settled' 
      })
    }
    
    // Determine if bet won or lost
    const won = bet.betType === result
    const newStatus = won ? 'won' : 'lost'
    
    // Update bet status
    await bet.update({
      status: newStatus,
      settledAt: new Date()
    })
    
    // Process payout if bet won
    if (won) {
      const user = await User.findByPk(bet.userId)
      const currentBalance = parseFloat(user.balance) || 0
      const payout = parseFloat(bet.potentialPayout) || 0
      const newBalance = currentBalance + payout
      
      await user.update({
        balance: newBalance
      })
      
      response.json({
        data: bet,
        payout: payout,
        newBalance: newBalance,
        message: `Bet won! Payout: $${payout.toFixed(2)}`
      })
    } else {
      response.json({
        data: bet,
        payout: 0,
        message: 'Bet lost'
      })
    }
  } catch (error) {
    console.error('Error settling bet:', error)
    response.status(500).json({ 
      error: 'Failed to settle bet',
      details: error.message
    })
  }
})

// Settle all pending bets for a specific event
betRouter.put('/settle-event/:eventId', requireAdmin, async (request, response) => {
  try {
    const { eventId } = request.params
    const { result } = request.body // 'home_win' or 'away_win'
    
    // Validate eventId
    if (!isValidEventId(eventId)) {
      return response.status(400).json({ 
        error: 'Invalid event ID format' 
      })
    }
    
    // Validate result
    if (!result || !isValidBetType(result)) {
      return response.status(400).json({ 
        error: 'Invalid result. Must be "home_win" or "away_win"' 
      })
    }
    
    // Find all pending bets for this event
    const pendingBets = await Bet.findAll({
      where: {
        eventId: eventId,
        status: 'pending'
      },
      include: [{
        model: User,
        attributes: ['id', 'balance']
      }]
    })
    
    if (pendingBets.length === 0) {
      return response.json({ 
        message: 'No pending bets found for this event',
        settledBets: 0
      })
    }
    
    const settlementResults = []
    let totalPayouts = 0
    
    // Process each bet
    for (const bet of pendingBets) {
      const won = bet.betType === result
      const newStatus = won ? 'won' : 'lost'
      
      // Update bet status
      await bet.update({
        status: newStatus,
        settledAt: new Date()
      })
      
      if (won) {
        // Process payout
        const user = bet.User
        const currentBalance = parseFloat(user.balance) || 0
        const payout = parseFloat(bet.potentialPayout) || 0
        const newBalance = currentBalance + payout
        
        await user.update({
          balance: newBalance
        })
        totalPayouts += payout
      }
      
      settlementResults.push({
        betId: bet.id,
        userId: bet.userId,
        betType: bet.betType,
        result: newStatus,
        payout: won ? bet.potentialPayout : 0
      })
    }
    
    response.json({
      message: `Settled ${pendingBets.length} bets for event ${eventId}`,
      settledBets: pendingBets.length,
      totalPayouts: totalPayouts,
      results: settlementResults
    })
  } catch (error) {
    console.error('Error settling event bets:', error)
    response.status(500).json({ 
      error: 'Failed to settle event bets',
      details: error.message
    })
  }
})

// Get all pending bets (admin function)
betRouter.get('/admin/pending', requireAdmin, async (request, response) => {
  try {
    const { eventId, limit = 100, offset = 0 } = request.query
    
    // Validate and sanitize query parameters
    const validatedLimit = validateInteger(limit, 1, 1000) || 100
    const validatedOffset = validateInteger(offset, 0, 10000) || 0
    
    const whereClause = { status: 'pending' }
    if (eventId) {
      // Validate eventId if provided
      if (!isValidEventId(eventId)) {
        return response.status(400).json({ 
          error: 'Invalid event ID format' 
        })
      }
      whereClause.eventId = eventId
    }
    
    const pendingBets = await Bet.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        attributes: ['id', 'username', 'email']
      }],
      order: [['eventDate', 'ASC']],
      limit: validatedLimit,
      offset: validatedOffset
    })
    
    response.json({
      data: pendingBets.rows,
      total: pendingBets.count,
      hasMore: (validatedOffset + validatedLimit) < pendingBets.count
    })
  } catch (error) {
    console.error('Error fetching pending bets:', error)
    response.status(500).json({ 
      error: 'Failed to fetch pending bets',
      details: error.message
    })
  }
})

module.exports = betRouter
