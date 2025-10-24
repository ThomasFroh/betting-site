import axios from 'axios'

const baseUrl = 'http://localhost:3001/api/odds'

const getSports = async () => {
  const response = await axios.get(`${baseUrl}/sports`)
  return response.data
}

const getOddsForSport = async (sport) => {
  const response = await axios.get(`${baseUrl}/${sport}/odds`)
  return response.data
}

export default { getSports, getOddsForSport }

