import { useState, useEffect } from 'react'
import './AdminPanel.css'

const AdminPanel = () => {
  const [pendingBets, setPendingBets] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedEventId, setSelectedEventId] = useState('')
  const [settlementResult, setSettlementResult] = useState('')
  const [settlementMessage, setSettlementMessage] = useState('')

  useEffect(() => {
    fetchPendingBets()
  }, [])

  const fetchPendingBets = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('loggedBettingAppUser')
      const user = token ? JSON.parse(token) : null
      
      if (!user || !user.token) {
        setError('Authentication required')
        return
      }
      
      const response = await fetch('/api/bets/admin/pending', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      
      if (response.ok) {
        setPendingBets(data.data || [])
      } else {
        setError(data.error || 'Failed to fetch pending bets')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const settleEvent = async () => {
    if (!selectedEventId || !settlementResult) {
      setError('Please select an event and result')
      return
    }

    try {
      setLoading(true)
      setError('')
      
      const token = localStorage.getItem('loggedBettingAppUser')
      const user = token ? JSON.parse(token) : null
      
      if (!user || !user.token) {
        setError('Authentication required')
        return
      }
      
      const response = await fetch(`/api/bets/settle-event/${selectedEventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ result: settlementResult })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setSettlementMessage(data.message)
        setSelectedEventId('')
        setSettlementResult('')
        fetchPendingBets() // Refresh the list
      } else {
        setError(data.error || 'Failed to settle event')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const settleIndividualBet = async (betId, result) => {
    try {
      setLoading(true)
      setError('')
      
      const token = localStorage.getItem('loggedBettingAppUser')
      const user = token ? JSON.parse(token) : null
      
      if (!user || !user.token) {
        setError('Authentication required')
        return
      }
      
      const response = await fetch(`/api/bets/settle/${betId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ result })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setSettlementMessage(data.message)
        fetchPendingBets() // Refresh the list
      } else {
        setError(data.error || 'Failed to settle bet')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Group bets by event
  const betsByEvent = pendingBets.reduce((acc, bet) => {
    if (!acc[bet.eventId]) {
      acc[bet.eventId] = []
    }
    acc[bet.eventId].push(bet)
    return acc
  }, {})

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const formatOdds = (odds) => {
    return odds > 0 ? `+${odds}` : odds.toString()
  }

  return (
    <div className="admin-panel">
      <h2>Admin Panel - Bet Settlement</h2>
      
      {error && <div className="error-message">{error}</div>}
      {settlementMessage && <div className="success-message">{settlementMessage}</div>}
      
      <div className="settlement-controls">
        <h3>Bulk Event Settlement</h3>
        <div className="form-group">
          <label>Select Event:</label>
          <select 
            value={selectedEventId} 
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            <option value="">Choose an event...</option>
            {Object.keys(betsByEvent).map(eventId => (
              <option key={eventId} value={eventId}>
                {eventId} ({betsByEvent[eventId].length} pending bets)
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label>Event Result:</label>
          <select 
            value={settlementResult} 
            onChange={(e) => setSettlementResult(e.target.value)}
          >
            <option value="">Choose result...</option>
            <option value="home_win">Home Team Wins</option>
            <option value="away_win">Away Team Wins</option>
          </select>
        </div>
        
        <button 
          onClick={settleEvent}
          disabled={loading || !selectedEventId || !settlementResult}
          className="settle-button"
        >
          {loading ? 'Settling...' : 'Settle Event'}
        </button>
      </div>

      <div className="pending-bets">
        <h3>Pending Bets ({pendingBets.length})</h3>
        
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="bets-list">
            {Object.entries(betsByEvent).map(([eventId, bets]) => (
              <div key={eventId} className="event-group">
                <h4>Event: {eventId}</h4>
                <div className="event-actions">
                  <button 
                    onClick={() => settleEvent(eventId, 'home_win')}
                    className="action-button home-win"
                  >
                    Home Wins
                  </button>
                  <button 
                    onClick={() => settleEvent(eventId, 'away_win')}
                    className="action-button away-win"
                  >
                    Away Wins
                  </button>
                </div>
                
                <div className="bets-table">
                  <table>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Bet Type</th>
                        <th>Amount</th>
                        <th>Odds</th>
                        <th>Potential Payout</th>
                        <th>Event Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bets.map(bet => (
                        <tr key={bet.id}>
                          <td>{bet.User?.username || bet.userId}</td>
                          <td>{bet.betType}</td>
                          <td>${bet.betAmount}</td>
                          <td>{formatOdds(bet.odds)}</td>
                          <td>${bet.potentialPayout}</td>
                          <td>{formatDate(bet.eventDate)}</td>
                          <td>
                            <button 
                              onClick={() => settleIndividualBet(bet.id, 'home_win')}
                              className="action-button small home-win"
                            >
                              Home
                            </button>
                            <button 
                              onClick={() => settleIndividualBet(bet.id, 'away_win')}
                              className="action-button small away-win"
                            >
                              Away
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminPanel
