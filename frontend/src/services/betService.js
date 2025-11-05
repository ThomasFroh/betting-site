import axios from 'axios'
// eslint-disable-next-line no-undef
const baseUrl = process.env.NODE_ENV === 'production' ? '/api/bets' : 'http://localhost:3001/api/bets'

// Helper function to get authorization token from localStorage
const getAuthToken = () => {
  const loggedUserJSON = window.localStorage.getItem('loggedBettingAppUser')
  if (loggedUserJSON) {
    const user = JSON.parse(loggedUserJSON)
    return user.token
  }
  return null
}

// Helper function to get authorization headers
const getAuthHeaders = () => {
  const token = getAuthToken()
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
  return {
    'Content-Type': 'application/json'
  }
}

const getBettingHistory = async (userId, status = 'all', limit = 50, offset = 0) => {
  const response = await axios.get(`${baseUrl}/history/${userId}`, {
    params: { status, limit, offset },
    headers: getAuthHeaders()
  })
  return response.data
}

const getUserBalance = async (userId) => {
  const response = await axios.get(`${baseUrl}/balance/${userId}`, {
    headers: getAuthHeaders()
  })
  return response.data
}

const placeBet = async (betData) => {
  const response = await axios.post(`${baseUrl}/place`, betData, {
    headers: getAuthHeaders()
  })
  return response.data
}

const cancelBet = async (betId, userId) => {
  const response = await axios.put(`${baseUrl}/cancel/${betId}`, { userId }, {
    headers: getAuthHeaders()
  })
  return response.data
}

const getPendingBets = async (userId) => {
  const response = await axios.get(`${baseUrl}/pending/${userId}`, {
    headers: getAuthHeaders()
  })
  return response.data
}

export default {
  getBettingHistory,
  getUserBalance,
  placeBet,
  cancelBet,
  getPendingBets
}
