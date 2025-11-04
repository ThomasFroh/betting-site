const Bet = require('../models/bet')
const User = require('../models/user')
const { Op } = require('sequelize')
const { requireAdmin } = require('../utils/adminAuth')

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
    
    const currentBalance = parseFloat(user.balance) || 0
    const amount = parseFloat(betAmount) || 0
    
    if (currentBalance < amount) {
      return response.status(400).json({ 
        error: 'Insufficient balance' 
      })
    }
    
    // Calculate potential payout
    let potentialPayout
    if (odds > 0) {
      // Positive odds: payout = betAmount + (betAmount * odds / 100)
      potentialPayout = amount + (amount * odds / 100)
    } else {
      // Negative odds: payout = betAmount + (betAmount * 100 / |odds|)
      potentialPayout = amount + (amount * 100 / Math.abs(odds))
    }
    
    // Create the bet
    const bet = await Bet.create({
      userId,
      eventId,
      sport,
      homeTeam,
      awayTeam,
      betType,
      betAmount: amount,
      odds,
      potentialPayout,
      eventDate: new Date(eventDate)
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

// Settle a bet (mark as won or lost and process payout)
betRouter.put('/settle/:betId', requireAdmin, async (request, response) => {
  try {
    const { betId } = request.params
    const { result } = request.body // 'home_win' or 'away_win'
    
    if (!result || !['home_win', 'away_win'].includes(result)) {
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
    
    if (!result || !['home_win', 'away_win'].includes(result)) {
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
    
    const whereClause = { status: 'pending' }
    if (eventId) {
      whereClause.eventId = eventId
    }
    
    const pendingBets = await Bet.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        attributes: ['id', 'username', 'email']
      }],
      order: [['eventDate', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
    
    response.json({
      data: pendingBets.rows,
      total: pendingBets.count,
      hasMore: (parseInt(offset) + parseInt(limit)) < pendingBets.count
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
