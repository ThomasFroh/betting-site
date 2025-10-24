const Bet = require('../models/bet')
const User = require('../models/user')
const { Op } = require('sequelize')

const betRouter = require('express').Router()

// Get user's betting history
betRouter.get('/history/:userId', async (request, response) => {
  try {
    const { userId } = request.params
    const { status, limit = 50, offset = 0 } = request.query
    
    const whereClause = { userId }
    if (status && status !== 'all') {
      whereClause.status = status
    }
    
    const bets = await Bet.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
    
    response.json({
      data: bets.rows,
      total: bets.count,
      hasMore: (parseInt(offset) + parseInt(limit)) < bets.count
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
betRouter.get('/balance/:userId', async (request, response) => {
  try {
    const { userId } = request.params
    const user = await User.findByPk(userId)
    
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
betRouter.post('/place', async (request, response) => {
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
    
    // Validate required fields
    if (!userId || !eventId || !sport || !homeTeam || !awayTeam || !betType || !betAmount || !odds || !eventDate) {
      return response.status(400).json({ 
        error: 'Missing required fields' 
      })
    }
    
    // Validate bet amount
    if (betAmount <= 0) {
      return response.status(400).json({ 
        error: 'Bet amount must be greater than 0' 
      })
    }
    
    // Get user and check balance
    const user = await User.findByPk(userId)
    if (!user) {
      return response.status(404).json({ error: 'User not found' })
    }
    
    if (user.balance < betAmount) {
      return response.status(400).json({ 
        error: 'Insufficient balance' 
      })
    }
    
    // Calculate potential payout
    let potentialPayout
    if (odds > 0) {
      // Positive odds: payout = betAmount + (betAmount * odds / 100)
      potentialPayout = betAmount + (betAmount * odds / 100)
    } else {
      // Negative odds: payout = betAmount + (betAmount * 100 / |odds|)
      potentialPayout = betAmount + (betAmount * 100 / Math.abs(odds))
    }
    
    // Create the bet
    const bet = await Bet.create({
      userId,
      eventId,
      sport,
      homeTeam,
      awayTeam,
      betType,
      betAmount,
      odds,
      potentialPayout,
      eventDate: new Date(eventDate)
    })
    
    // Deduct bet amount from user balance
    await user.update({
      balance: user.balance - betAmount
    })
    
    response.status(201).json({
      data: bet,
      newBalance: user.balance - betAmount
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
betRouter.put('/cancel/:betId', async (request, response) => {
  try {
    const { betId } = request.params
    const { userId } = request.body
    
    const bet = await Bet.findOne({
      where: {
        id: betId,
        userId: userId,
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
    
    // Refund the bet amount
    const user = await User.findByPk(userId)
    await user.update({
      balance: user.balance + bet.betAmount
    })
    
    // Update bet status
    await bet.update({
      status: 'cancelled',
      settledAt: new Date()
    })
    
    response.json({
      data: bet,
      newBalance: user.balance + bet.betAmount
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
betRouter.get('/pending/:userId', async (request, response) => {
  try {
    const { userId } = request.params
    
    const pendingBets = await Bet.findAll({
      where: {
        userId: userId,
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

module.exports = betRouter
