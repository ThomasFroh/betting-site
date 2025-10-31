const jwt = require('jsonwebtoken')
const config = require('./config')

/**
 * Middleware to verify admin authentication
 * Checks if the user is authenticated and has admin role
 */
const requireAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      })
    }
    
    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      })
    }
    
    const decoded = jwt.verify(token, config.SECRET)
    
    if (!decoded.role || decoded.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Access denied. Admin privileges required.' 
      })
    }
    
    // Add user info to request object
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role
    }
    
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Access denied. Invalid token.' 
      })
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Access denied. Token expired.' 
      })
    }
    
    console.error('Admin auth error:', error)
    return res.status(500).json({ 
      error: 'Internal server error during authentication.' 
    })
  }
}

/**
 * Middleware to verify user authentication (any role)
 * Checks if the user is authenticated
 */
const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      })
    }
    
    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      })
    }
    
    const decoded = jwt.verify(token, config.SECRET)
    
    // Add user info to request object
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role
    }
    
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Access denied. Invalid token.' 
      })
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Access denied. Token expired.' 
      })
    }
    
    console.error('Auth error:', error)
    return res.status(500).json({ 
      error: 'Internal server error during authentication.' 
    })
  }
}

module.exports = {
  requireAdmin,
  requireAuth
}
