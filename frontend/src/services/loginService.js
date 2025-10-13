import axios from 'axios'
// eslint-disable-next-line no-undef
const baseUrl = process.env.NODE_ENV === 'production' ? '/api/login' : 'http://localhost:3001/api/login'

const login = async credentials => {
  const response = await axios.post(baseUrl, credentials)
  return response.data
}

const register = async credentials => {
  const response = await axios.post(baseUrl + '/register', credentials)
  return response.data
}

export default { login, register }
