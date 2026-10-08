const sequelize = require('../database')
const Prediction = require('../models/prediction')
const PredictionEntry = require('../models/predictionEntry')
const User = require('../models/user')
const { requireAuth } = require('../utils/adminAuth')
const { isValidUUID } = require('../utils/validation')
const { Op } = require('sequelize')

const predictionRouter = require('express').Router()

const MIN_STAKE = 1
const MAX_STAKE = 10000

const toMoney = (value) => Math.round(Number(value) * 100) / 100

const summarizeEntries = (entries) => {
  let potA = 0
  let potB = 0
  let countA = 0
  let countB = 0

  for (const entry of entries) {
    if (entry.status !== 'active' && entry.status !== 'won' && entry.status !== 'lost') {
      continue
    }
    const amount = Number(entry.amount)
    if (entry.option === 'A') {
      potA += amount
      countA += 1
    } else if (entry.option === 'B') {
      potB += amount
      countB += 1
    }
  }

  const totalPot = potA + potB
  const percentA = totalPot > 0 ? (potA / totalPot) * 100 : 50
  const percentB = totalPot > 0 ? (potB / totalPot) * 100 : 50

  return {
    potA: toMoney(potA),
    potB: toMoney(potB),
    totalPot: toMoney(totalPot),
    countA,
    countB,
    percentA: Math.round(percentA * 10) / 10,
    percentB: Math.round(percentB * 10) / 10
  }
}

const formatPrediction = (prediction, entries = []) => {
  const summary = summarizeEntries(entries)
  return {
    ...prediction.toJSON(),
    ...summary,
    entries: entries.map((entry) => entry.toJSON())
  }
}

const computeWinnerPayouts = (winningEntries, totalPot) => {
  const potCents = Math.round(Number(totalPot) * 100)
  const winningTotal = winningEntries.reduce((sum, e) => sum + Number(e.amount), 0)
  const winningTotalCents = Math.round(winningTotal * 100)

  // One-sided pot: refund stakes only
  if (winningTotalCents === potCents) {
    return winningEntries.map((entry) => ({
      entryId: entry.id,
      userId: entry.userId,
      payout: toMoney(entry.amount)
    }))
  }

  // Proportional split in cents; leftover to largest stake
  const payouts = winningEntries.map((entry) => {
    const stakeCents = Math.round(Number(entry.amount) * 100)
    const payoutCents = Math.floor((stakeCents * potCents) / winningTotalCents)
    return {
      entryId: entry.id,
      userId: entry.userId,
      payoutCents,
      stakeCents
    }
  })

  let distributed = payouts.reduce((sum, p) => sum + p.payoutCents, 0)
  let remainder = potCents - distributed

  payouts.sort((a, b) => b.stakeCents - a.stakeCents)
  let i = 0
  while (remainder > 0 && payouts.length > 0) {
    payouts[i % payouts.length].payoutCents += 1
    remainder -= 1
    i += 1
  }

  return payouts.map((p) => ({
    entryId: p.entryId,
    userId: p.userId,
    payout: p.payoutCents / 100
  }))
}

// Create prediction
predictionRouter.post('/', requireAuth, async (request, response) => {
  try {
    const { title, optionA, optionB } = request.body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return response.status(400).json({ error: 'Title is required' })
    }
    if (!optionA || typeof optionA !== 'string' || !optionA.trim()) {
      return response.status(400).json({ error: 'Option A is required' })
    }
    if (!optionB || typeof optionB !== 'string' || !optionB.trim()) {
      return response.status(400).json({ error: 'Option B is required' })
    }
    if (title.trim().length > 200) {
      return response.status(400).json({ error: 'Title must be 200 characters or fewer' })
    }
    if (optionA.trim().length > 100 || optionB.trim().length > 100) {
      return response.status(400).json({ error: 'Options must be 100 characters or fewer' })
    }

    const prediction = await Prediction.create({
      creatorId: request.user.id,
      title: title.trim(),
      optionA: optionA.trim(),
      optionB: optionB.trim(),
      status: 'open'
    })

    response.status(201).json({ data: formatPrediction(prediction, []) })
  } catch (error) {
    console.error('Error creating prediction:', error)
    response.status(500).json({ error: 'Failed to create prediction' })
  }
})

// List predictions
predictionRouter.get('/', requireAuth, async (request, response) => {
  try {
    const { status } = request.query
    const where = {}

    if (status && status !== 'all') {
      const allowed = ['open', 'locked', 'resolved', 'voided']
      if (!allowed.includes(status)) {
        return response.status(400).json({ error: 'Invalid status filter' })
      }
      where.status = status
    } else if (!status) {
      // Default: show joinable / recently locked predictions
      where.status = { [Op.in]: ['open', 'locked'] }
    }

    const predictions = await Prediction.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 100
    })

    const result = []
    for (const prediction of predictions) {
      const entries = await PredictionEntry.findAll({
        where: { predictionId: prediction.id }
      })
      result.push(formatPrediction(prediction, entries))
    }

    response.json({ data: result })
  } catch (error) {
    console.error('Error listing predictions:', error)
    response.status(500).json({ error: 'Failed to list predictions' })
  }
})

// Get prediction detail
predictionRouter.get('/:id', requireAuth, async (request, response) => {
  try {
    const { id } = request.params
    if (!isValidUUID(id)) {
      return response.status(400).json({ error: 'Invalid prediction ID' })
    }

    const prediction = await Prediction.findByPk(id)
    if (!prediction) {
      return response.status(404).json({ error: 'Prediction not found' })
    }

    const entries = await PredictionEntry.findAll({
      where: { predictionId: id }
    })

    response.json({ data: formatPrediction(prediction, entries) })
  } catch (error) {
    console.error('Error fetching prediction:', error)
    response.status(500).json({ error: 'Failed to fetch prediction' })
  }
})

// Enter / place stake
predictionRouter.post('/:id/enter', requireAuth, async (request, response) => {
  const transaction = await sequelize.transaction()
  try {
    const { id } = request.params
    const { option, amount } = request.body

    if (!isValidUUID(id)) {
      await transaction.rollback()
      return response.status(400).json({ error: 'Invalid prediction ID' })
    }
    if (option !== 'A' && option !== 'B') {
      await transaction.rollback()
      return response.status(400).json({ error: 'Option must be A or B' })
    }

    const stake = Number(amount)
    if (!Number.isFinite(stake) || stake < MIN_STAKE) {
      await transaction.rollback()
      return response.status(400).json({ error: `Minimum stake is $${MIN_STAKE}` })
    }
    if (stake > MAX_STAKE) {
      await transaction.rollback()
      return response.status(400).json({ error: `Maximum stake is $${MAX_STAKE}` })
    }

    const prediction = await Prediction.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    })
    if (!prediction) {
      await transaction.rollback()
      return response.status(404).json({ error: 'Prediction not found' })
    }
    if (prediction.status !== 'open') {
      await transaction.rollback()
      return response.status(400).json({ error: 'Prediction is not open for entries' })
    }

    const existing = await PredictionEntry.findOne({
      where: { predictionId: id, userId: request.user.id },
      transaction
    })
    if (existing) {
      await transaction.rollback()
      return response.status(400).json({ error: 'You already have an entry on this prediction' })
    }

    const user = await User.findByPk(request.user.id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    })
    if (!user) {
      await transaction.rollback()
      return response.status(404).json({ error: 'User not found' })
    }

    const balance = Number(user.balance)
    if (balance < stake) {
      await transaction.rollback()
      return response.status(400).json({ error: 'Insufficient balance' })
    }

    const roundedStake = toMoney(stake)
    user.balance = toMoney(balance - roundedStake)
    await user.save({ transaction })

    const entry = await PredictionEntry.create({
      predictionId: id,
      userId: request.user.id,
      option,
      amount: roundedStake,
      status: 'active'
    }, { transaction })

    await transaction.commit()

    const entries = await PredictionEntry.findAll({ where: { predictionId: id } })
    response.status(201).json({
      data: formatPrediction(prediction, entries),
      entry: entry.toJSON(),
      newBalance: Number(user.balance)
    })
  } catch (error) {
    await transaction.rollback()
    if (error.name === 'SequelizeUniqueConstraintError') {
      return response.status(400).json({ error: 'You already have an entry on this prediction' })
    }
    console.error('Error entering prediction:', error)
    response.status(500).json({ error: 'Failed to place entry' })
  }
})

// Cancel own entry while open
predictionRouter.put('/:id/cancel-entry', requireAuth, async (request, response) => {
  const transaction = await sequelize.transaction()
  try {
    const { id } = request.params
    if (!isValidUUID(id)) {
      await transaction.rollback()
      return response.status(400).json({ error: 'Invalid prediction ID' })
    }

    const prediction = await Prediction.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    })
    if (!prediction) {
      await transaction.rollback()
      return response.status(404).json({ error: 'Prediction not found' })
    }
    if (prediction.status !== 'open') {
      await transaction.rollback()
      return response.status(400).json({ error: 'Can only cancel while prediction is open' })
    }

    const entry = await PredictionEntry.findOne({
      where: {
        predictionId: id,
        userId: request.user.id,
        status: 'active'
      },
      transaction,
      lock: transaction.LOCK.UPDATE
    })
    if (!entry) {
      await transaction.rollback()
      return response.status(404).json({ error: 'No active entry found' })
    }

    const user = await User.findByPk(request.user.id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    })
    if (!user) {
      await transaction.rollback()
      return response.status(404).json({ error: 'User not found' })
    }

    user.balance = toMoney(Number(user.balance) + Number(entry.amount))
    await user.save({ transaction })

    // Destroy so the user can place a new entry (unique on predictionId+userId)
    await entry.destroy({ transaction })

    await transaction.commit()

    const entries = await PredictionEntry.findAll({ where: { predictionId: id } })
    response.json({
      data: formatPrediction(prediction, entries),
      newBalance: Number(user.balance)
    })
  } catch (error) {
    await transaction.rollback()
    console.error('Error canceling entry:', error)
    response.status(500).json({ error: 'Failed to cancel entry' })
  }
})

// Lock prediction (creator only)
predictionRouter.put('/:id/lock', requireAuth, async (request, response) => {
  try {
    const { id } = request.params
    if (!isValidUUID(id)) {
      return response.status(400).json({ error: 'Invalid prediction ID' })
    }

    const prediction = await Prediction.findByPk(id)
    if (!prediction) {
      return response.status(404).json({ error: 'Prediction not found' })
    }
    if (prediction.creatorId !== request.user.id) {
      return response.status(403).json({ error: 'Only the creator can lock this prediction' })
    }
    if (prediction.status !== 'open') {
      return response.status(400).json({ error: 'Prediction must be open to lock' })
    }

    prediction.status = 'locked'
    prediction.lockedAt = new Date()
    await prediction.save()

    const entries = await PredictionEntry.findAll({ where: { predictionId: id } })
    response.json({ data: formatPrediction(prediction, entries) })
  } catch (error) {
    console.error('Error locking prediction:', error)
    response.status(500).json({ error: 'Failed to lock prediction' })
  }
})

// Resolve prediction (creator only)
predictionRouter.put('/:id/resolve', requireAuth, async (request, response) => {
  const transaction = await sequelize.transaction()
  try {
    const { id } = request.params
    const { winningOption } = request.body

    if (!isValidUUID(id)) {
      await transaction.rollback()
      return response.status(400).json({ error: 'Invalid prediction ID' })
    }
    if (winningOption !== 'A' && winningOption !== 'B') {
      await transaction.rollback()
      return response.status(400).json({ error: 'winningOption must be A or B' })
    }

    const prediction = await Prediction.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    })
    if (!prediction) {
      await transaction.rollback()
      return response.status(404).json({ error: 'Prediction not found' })
    }
    if (prediction.creatorId !== request.user.id) {
      await transaction.rollback()
      return response.status(403).json({ error: 'Only the creator can resolve this prediction' })
    }
    if (prediction.status !== 'locked' && prediction.status !== 'open') {
      await transaction.rollback()
      return response.status(400).json({ error: 'Prediction cannot be resolved in its current state' })
    }

    const entries = await PredictionEntry.findAll({
      where: { predictionId: id, status: 'active' },
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    if (entries.length === 0) {
      await transaction.rollback()
      return response.status(400).json({ error: 'Cannot resolve a prediction with no entries' })
    }

    const totalPot = entries.reduce((sum, e) => sum + Number(e.amount), 0)
    const winners = entries.filter((e) => e.option === winningOption)
    const losers = entries.filter((e) => e.option !== winningOption)

    if (winners.length === 0) {
      await transaction.rollback()
      return response.status(400).json({
        error: 'No entries on the winning side. Void the prediction instead, or pick the other option.'
      })
    }

    const payouts = computeWinnerPayouts(winners, totalPot)
    const payoutByEntryId = Object.fromEntries(payouts.map((p) => [p.entryId, p.payout]))

    for (const entry of winners) {
      const payout = payoutByEntryId[entry.id]
      entry.status = 'won'
      entry.payout = payout
      await entry.save({ transaction })

      const user = await User.findByPk(entry.userId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      })
      if (user) {
        user.balance = toMoney(Number(user.balance) + payout)
        await user.save({ transaction })
      }
    }

    for (const entry of losers) {
      entry.status = 'lost'
      entry.payout = 0
      await entry.save({ transaction })
    }

    prediction.status = 'resolved'
    prediction.winningOption = winningOption
    prediction.resolvedAt = new Date()
    if (!prediction.lockedAt) {
      prediction.lockedAt = new Date()
    }
    await prediction.save({ transaction })

    await transaction.commit()

    const allEntries = await PredictionEntry.findAll({ where: { predictionId: id } })
    response.json({ data: formatPrediction(prediction, allEntries) })
  } catch (error) {
    await transaction.rollback()
    console.error('Error resolving prediction:', error)
    response.status(500).json({ error: 'Failed to resolve prediction' })
  }
})

// Void prediction (creator only) — refund all active entries
predictionRouter.put('/:id/void', requireAuth, async (request, response) => {
  const transaction = await sequelize.transaction()
  try {
    const { id } = request.params
    if (!isValidUUID(id)) {
      await transaction.rollback()
      return response.status(400).json({ error: 'Invalid prediction ID' })
    }

    const prediction = await Prediction.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    })
    if (!prediction) {
      await transaction.rollback()
      return response.status(404).json({ error: 'Prediction not found' })
    }
    if (prediction.creatorId !== request.user.id) {
      await transaction.rollback()
      return response.status(403).json({ error: 'Only the creator can void this prediction' })
    }
    if (prediction.status !== 'open' && prediction.status !== 'locked') {
      await transaction.rollback()
      return response.status(400).json({ error: 'Prediction cannot be voided in its current state' })
    }

    const entries = await PredictionEntry.findAll({
      where: { predictionId: id, status: 'active' },
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    for (const entry of entries) {
      const user = await User.findByPk(entry.userId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      })
      if (user) {
        user.balance = toMoney(Number(user.balance) + Number(entry.amount))
        await user.save({ transaction })
      }
      entry.status = 'refunded'
      entry.payout = Number(entry.amount)
      await entry.save({ transaction })
    }

    prediction.status = 'voided'
    prediction.resolvedAt = new Date()
    await prediction.save({ transaction })

    await transaction.commit()

    const allEntries = await PredictionEntry.findAll({ where: { predictionId: id } })
    response.json({ data: formatPrediction(prediction, allEntries) })
  } catch (error) {
    await transaction.rollback()
    console.error('Error voiding prediction:', error)
    response.status(500).json({ error: 'Failed to void prediction' })
  }
})

module.exports = predictionRouter
