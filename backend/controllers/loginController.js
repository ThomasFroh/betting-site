const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const loginRouter = require('express').Router()
const User = require('../models/user')
const config = require('../utils/config')

loginRouter.post('/', async (request, response) => {
  const { username, password } = request.body

  const user = await User.findOne({ where: { username } })
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
  }

  const token = jwt.sign(userForToken, config.SECRET, { expiresIn: '1h' })

  response
    .status(200)
    .send({ token, username: user.username, id: user.id })
})

loginRouter.post('/register', async (request, response) => {
  try {
    const { id, username, password } = request.body
    
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    const user = await User.create({ id, username, passwordHash })

    const userForToken = {
      username: user.username,
      id: user.id,
    }

    const token = jwt.sign(userForToken, config.SECRET, { expiresIn: '1h' })

    response
      .status(201)
      .send({ token, username: user.username, id: user.id })
  } catch (error) {
    console.error('Registration error:', error)
    response.status(400).json({ error: error.message })
  }
})

module.exports = loginRouter