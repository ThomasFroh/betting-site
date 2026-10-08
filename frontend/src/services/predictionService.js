import axios from 'axios'
// eslint-disable-next-line no-undef
const baseUrl = process.env.NODE_ENV === 'production' ? '/api/predictions' : 'http://localhost:3001/api/predictions'

const getAuthToken = () => {
  const loggedUserJSON = window.localStorage.getItem('loggedBettingAppUser')
  if (loggedUserJSON) {
    const user = JSON.parse(loggedUserJSON)
    return user.token
  }
  return null
}

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

const listPredictions = async (status) => {
  const params = {}
  if (status) params.status = status
  const response = await axios.get(baseUrl, {
    params,
    headers: getAuthHeaders()
  })
  return response.data
}

const getPrediction = async (id) => {
  const response = await axios.get(`${baseUrl}/${id}`, {
    headers: getAuthHeaders()
  })
  return response.data
}

const createPrediction = async ({ title, optionA, optionB }) => {
  const response = await axios.post(baseUrl, { title, optionA, optionB }, {
    headers: getAuthHeaders()
  })
  return response.data
}

const enterPrediction = async (id, { option, amount }) => {
  const response = await axios.post(`${baseUrl}/${id}/enter`, { option, amount }, {
    headers: getAuthHeaders()
  })
  return response.data
}

const cancelEntry = async (id) => {
  const response = await axios.put(`${baseUrl}/${id}/cancel-entry`, {}, {
    headers: getAuthHeaders()
  })
  return response.data
}

const lockPrediction = async (id) => {
  const response = await axios.put(`${baseUrl}/${id}/lock`, {}, {
    headers: getAuthHeaders()
  })
  return response.data
}

const resolvePrediction = async (id, winningOption) => {
  const response = await axios.put(`${baseUrl}/${id}/resolve`, { winningOption }, {
    headers: getAuthHeaders()
  })
  return response.data
}

const voidPrediction = async (id) => {
  const response = await axios.put(`${baseUrl}/${id}/void`, {}, {
    headers: getAuthHeaders()
  })
  return response.data
}

export default {
  listPredictions,
  getPrediction,
  createPrediction,
  enterPrediction,
  cancelEntry,
  lockPrediction,
  resolvePrediction,
  voidPrediction
}
