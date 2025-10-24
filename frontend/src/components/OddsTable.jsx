import { useState, useEffect, useCallback } from 'react'
import oddsService from '../services/oddsService'
import betService from '../services/betService'
import BetForm from './BetForm'
import './OddsTable.css'

const OddsTable = ({ user }) => {
  const [oddsCache, setOddsCache] = useState({
    americanfootball_nfl: null,
    americanfootball_ncaaf: null,
    basketball_nba: null,
    mma_mixed_martial_arts: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSport, setSelectedSport] = useState('americanfootball_nfl')
  const [showBetForm, setShowBetForm] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedOutcome, setSelectedOutcome] = useState(null)
  const [userBalance, setUserBalance] = useState(0)

  const sports = [
    { key: 'americanfootball_nfl', title: 'NFL' },
    { key: 'americanfootball_ncaaf', title: 'NCAA Football' },
    { key: 'basketball_nba', title: 'NBA' },
    { key: 'mma_mixed_martial_arts', title: 'UFC/MMA' }
  ]

  const fetchAllOdds = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch odds for all sports in parallel
      const promises = sports.map(sport => 
        oddsService.getOddsForSport(sport.key)
          .then(response => ({ sport: sport.key, data: response.data || [] }))
          .catch(err => {
            console.error(`Error fetching ${sport.title} odds:`, err)
            return { sport: sport.key, data: [] }
          })
      )

      const results = await Promise.all(promises)
      
      // Build the cache object
      const newCache = {}
      results.forEach(result => {
        newCache[result.sport] = result.data
      })
      
      setOddsCache(newCache)
    } catch (err) {
      console.error('Error fetching odds:', err)
      setError('Failed to load odds. Please try again later.')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch all sports data once on component mount
  useEffect(() => {
    fetchAllOdds()
  }, [fetchAllOdds])

  // Fetch user balance when user changes
  useEffect(() => {
    if (user) {
      fetchUserBalance()
    }
  }, [user, fetchUserBalance])

  const fetchUserBalance = useCallback(async () => {
    try {
      const response = await betService.getUserBalance(user.id)
      setUserBalance(response.balance)
    } catch (err) {
      console.error('Error fetching user balance:', err)
    }
  }, [user?.id])

  const handleBetClick = (event, outcome) => {
    if (!user) {
      alert('Please log in to place bets')
      return
    }
    
    setSelectedEvent(event)
    setSelectedOutcome(outcome)
    setShowBetForm(true)
  }

  const handleBetPlaced = (result) => {
    setUserBalance(result.newBalance)
    setShowBetForm(false)
    setSelectedEvent(null)
    setSelectedOutcome(null)
    alert('Bet placed successfully!')
  }

  const handleCloseBetForm = () => {
    setShowBetForm(false)
    setSelectedEvent(null)
    setSelectedOutcome(null)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatOdds = (price) => {
    if (price > 0) return `+${price}`
    return `${price}`
  }

  // Get current sport's odds from cache
  const currentOdds = oddsCache[selectedSport] || []

  if (loading) {
    return (
      <div className="odds-container">
        <div className="loading">Loading odds for all sports...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="odds-container">
        <div className="error">{error}</div>
        <button onClick={fetchAllOdds} className="retry-btn">Retry</button>
      </div>
    )
  }

  return (
    <div className="odds-container">
      <div className="odds-header">
        <h2>Available Bets</h2>
        <div className="sport-selector">
          {sports.map(sport => (
            <button
              key={sport.key}
              className={`sport-btn ${selectedSport === sport.key ? 'active' : ''}`}
              onClick={() => setSelectedSport(sport.key)}
            >
              {sport.title}
              {oddsCache[sport.key] && (
                <span className="game-count"> ({oddsCache[sport.key].length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {currentOdds.length === 0 ? (
        <div className="no-odds">No upcoming games available for this sport.</div>
      ) : (
        <div className="table-wrapper">
          <table className="odds-table">
            <thead>
              <tr>
                <th>Game</th>
                <th>Date & Time</th>
                <th>Home Team</th>
                <th>Away Team</th>
                <th>Home Odds</th>
                <th>Away Odds</th>
                <th>Bookmaker</th>
              </tr>
            </thead>
            <tbody>
              {currentOdds.map((event) => {
                // Get the best odds from all bookmakers
                const bookmaker = event.bookmakers?.[0]
                const h2hMarket = bookmaker?.markets?.find(m => m.key === 'h2h')
                const homeTeam = event.home_team
                const awayTeam = event.away_team
                
                const homeOutcome = h2hMarket?.outcomes?.find(o => o.name === homeTeam)
                const awayOutcome = h2hMarket?.outcomes?.find(o => o.name === awayTeam)

                return (
                  <tr key={event.id} className="game-row">
                    <td className="game-title">
                      <div className="matchup">
                        {awayTeam} @ {homeTeam}
                      </div>
                    </td>
                    <td className="game-date">{formatDate(event.commence_time)}</td>
                    <td className="team-name home">{homeTeam}</td>
                    <td className="team-name away">{awayTeam}</td>
                    <td className="odds">
                      {homeOutcome ? (
                        <button 
                          className={`odds-button ${homeOutcome.price > 0 ? 'positive' : 'negative'}`}
                          onClick={() => handleBetClick(event, homeOutcome)}
                        >
                          {formatOdds(homeOutcome.price)}
                        </button>
                      ) : (
                        <span className="odds-value">N/A</span>
                      )}
                    </td>
                    <td className="odds">
                      {awayOutcome ? (
                        <button 
                          className={`odds-button ${awayOutcome.price > 0 ? 'positive' : 'negative'}`}
                          onClick={() => handleBetClick(event, awayOutcome)}
                        >
                          {formatOdds(awayOutcome.price)}
                        </button>
                      ) : (
                        <span className="odds-value">N/A</span>
                      )}
                    </td>
                    <td className="bookmaker">{bookmaker?.title || 'N/A'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showBetForm && (
        <BetForm
          event={selectedEvent}
          selectedOutcome={selectedOutcome}
          onBetPlaced={handleBetPlaced}
          onClose={handleCloseBetForm}
          userId={user?.id}
          userBalance={userBalance}
        />
      )}
    </div>
  )
}

export default OddsTable

