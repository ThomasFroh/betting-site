const app = require('./app') // The Express app
const config = require('./utils/config')
const logger = require('./utils/logger')

const PORT = config.PORT || 3001

app.listen(PORT, () => {
    logger.info(`Server running on port ${config.PORT}`)
})
