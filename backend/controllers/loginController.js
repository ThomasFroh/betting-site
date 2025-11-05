const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const loginRouter = require('express').Router()
const User = require('../models/user')
const config = require('../utils/config')
const { sanitizeString, isValidUUID } = require('../utils/validation')

loginRouter.post('/', async (request, response) => {
  const { username, password } = request.body

  // Sanitize username input
  const sanitizedUsername = sanitizeString(username, 100)
  if (!sanitizedUsername) {
    return response.status(400).json({
      error: 'Invalid username format'
    })
  }

  const user = await User.findOne({ where: { username: sanitizedUsername } })
  const passwordCorrect = user === null
    ? false
    : await bcrypt.compare(password, user.passwordHash)

  if (!(user && passwordCorrect)) {
    return response.status(401).json({
      error: 'invalid id or password'
    })
  }

  const userForToken = {
    username: user.username,
    id: user.id,
    role: user.role,
  }

  const token = jwt.sign(userForToken, config.SECRET, { expiresIn: '1h' })

  response
    .status(200)
    .send({ token, username: user.username, id: user.id, role: user.role })
})

loginRouter.post('/register', async (request, response) => {
  try {
    const { id, username, password } = request.body
    
    // Validate and sanitize inputs
    const sanitizedUsername = sanitizeString(username, 100)
    if (!sanitizedUsername) {
      return response.status(400).json({
        error: 'Invalid username format'
      })
    }
    
    // Validate password (basic check - should be at least 6 characters)
    if (!password || typeof password !== 'string' || password.length < 6) {
      return response.status(400).json({
        error: 'Password must be at least 6 characters'
      })
    }
    
    // Validate ID if provided (should be UUID)
    if (id && !isValidUUID(id)) {
      return response.status(400).json({
        error: 'Invalid user ID format'
      })
    }
    
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    const user = await User.create({ 
      id: id || undefined, // Let DB generate if not provided
      username: sanitizedUsername, 
      passwordHash 
    })

    const userForToken = {
      username: user.username,
      id: user.id,
      role: user.role,
    }

    const token = jwt.sign(userForToken, config.SECRET, { expiresIn: '1h' })

    response
      .status(201)
      .send({ token, username: user.username, id: user.id, role: user.role })
  } catch (error) {
    console.error('Registration error:', error)
    response.status(400).json({ error: error.message })
  }
})

module.exports = loginRouter