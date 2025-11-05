/**
 * Input validation utilities to prevent SQL injection and other attacks
 */

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Allowed bet status values
const ALLOWED_BET_STATUSES = ['pending', 'won', 'lost', 'cancelled', 'all']

// Allowed bet types
const ALLOWED_BET_TYPES = ['home_win', 'away_win']

// Allowed sports
const ALLOWED_SPORTS = [
  'americanfootball_nfl',
  'americanfootball_ncaaf',
  'basketball_nba',
  'mma_mixed_martial_arts'
]

/**
 * Validate UUID format
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if valid UUID
 */
function isValidUUID(id) {
  if (typeof id !== 'string') return false
  return UUID_REGEX.test(id)
}

/**
 * Validate and sanitize integer
 * @param {any} value - The value to validate
 * @param {number} min - Minimum value (default: 0)
 * @param {number} max - Maximum value (default: 10000)
 * @returns {number|null} - Validated integer or null if invalid
 */
function validateInteger(value, min = 0, max = 10000) {
  if (value === undefined || value === null) return null
  const parsed = parseInt(value, 10)
  if (isNaN(parsed) || parsed < min || parsed > max) return null
  return parsed
}

/**
 * Validate enum value against allowed values
 * @param {string} value - The value to validate
 * @param {string[]} allowedValues - Array of allowed values
 * @returns {boolean} - True if valid
 */
function isValidEnum(value, allowedValues) {
  if (typeof value !== 'string') return false
  return allowedValues.includes(value)
}

/**
 * Validate bet status
 * @param {string} status - Status to validate
 * @returns {boolean} - True if valid
 */
function isValidBetStatus(status) {
  return isValidEnum(status, ALLOWED_BET_STATUSES)
}

/**
 * Validate bet type
 * @param {string} betType - Bet type to validate
 * @returns {boolean} - True if valid
 */
function isValidBetType(betType) {
  return isValidEnum(betType, ALLOWED_BET_TYPES)
}

/**
 * Validate sport
 * @param {string} sport - Sport to validate
 * @returns {boolean} - True if valid
 */
function isValidSport(sport) {
  return isValidEnum(sport, ALLOWED_SPORTS)
}

/**
 * Sanitize string to prevent SQL injection
 * Removes potentially dangerous characters
 * @param {string} str - String to sanitize
 * @param {number} maxLength - Maximum length (default: 500)
 * @returns {string|null} - Sanitized string or null if invalid
 */
function sanitizeString(str, maxLength = 500) {
  if (typeof str !== 'string') return null
  // Remove null bytes and control characters
  const sanitized = str.replace(/[\x00-\x1F\x7F]/g, '').trim()
  if (sanitized.length === 0 || sanitized.length > maxLength) return null
  // Check for SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/i,
    /(--|;|\/\*|\*\/|'|"|`)/,
    /(\bor\b|\band\b)\s+\d+\s*=\s*\d+/i
  ]
  for (const pattern of sqlPatterns) {
    if (pattern.test(sanitized)) {
      return null
    }
  }
  return sanitized
}

/**
 * Validate event ID format (alphanumeric, hyphens, underscores)
 * @param {string} eventId - Event ID to validate
 * @returns {boolean} - True if valid
 */
function isValidEventId(eventId) {
  if (typeof eventId !== 'string') return false
  // Event IDs are typically alphanumeric with hyphens and underscores
  // Max length reasonable for event IDs
  if (eventId.length === 0 || eventId.length > 100) return false
  return /^[a-zA-Z0-9_-]+$/.test(eventId)
}

module.exports = {
  isValidUUID,
  validateInteger,
  isValidEnum,
  isValidBetStatus,
  isValidBetType,
  isValidSport,
  sanitizeString,
  isValidEventId,
  ALLOWED_BET_STATUSES,
  ALLOWED_BET_TYPES,
  ALLOWED_SPORTS
}

