import axios from 'axios'

const baseUrl = 'http://localhost:3001/api/bets'

const getBettingHistory = async (userId, status = 'all', limit = 50, offset = 0) => {
  const response = await axios.get(`${baseUrl}/history/${userId}`, {
    params: { status, limit, offset }
  })
  return response.data
}

const getUserBalance = async (userId) => {
  const response = await axios.get(`${baseUrl}/balance/${userId}`)
  return response.data
}

const placeBet = async (betData) => {
  const response = await axios.post(`${baseUrl}/place`, betData)
  return response.data
}

const cancelBet = async (betId, userId) => {
  const response = await axios.put(`${baseUrl}/cancel/${betId}`, { userId })
  return response.data
}

const getPendingBets = async (userId) => {
  const response = await axios.get(`${baseUrl}/pending/${userId}`)
  return response.data
}

export default {
  getBettingHistory,
  getUserBalance,
  placeBet,
  cancelBet,
  getPendingBets
}
