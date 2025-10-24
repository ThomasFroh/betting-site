const config = require('./utils/config')
const express = require('express')
const cors = require('cors')
const loginRouter = require('./controllers/loginController')
const oddsRouter = require('./controllers/oddsController')
const betRouter = require('./controllers/betController')
const logger = require('./utils/logger')
const middleware = require('./utils/middleware')
const path = require('path')

const app = express()

app.use(cors())
// app.use(express.static('dist'))
app.use(express.json())

app.use('/api/login', loginRouter)
app.use('/api/odds', oddsRouter)
app.use('/api/bets', betRouter)

// Serve React build in production
if (config.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'frontend/build')))

    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'))
    })
}

app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)


module.exports = app