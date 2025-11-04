const app = require('./app') // The Express app
const config = require('./utils/config')
const logger = require('./utils/logger')
const sequelize = require('./database')
const User = require('./models/user')
const Bet = require('./models/bet')

const PORT = config.PORT || 3001

// Initialize database and models
const initializeDatabase = async () => {
  try {
    await sequelize.authenticate()
    logger.info('Database connection established successfully')
    
    // Sync models with database
    await User.sync({ alter: true })
    await Bet.sync({ alter: true })
    logger.info('Database models synchronized')
  } catch (error) {
    logger.error('Unable to connect to the database:', error)
    process.exit(1)
  }
}

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${config.PORT}`)
  })
})
