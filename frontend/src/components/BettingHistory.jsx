import { useState, useEffect } from 'react'
import betService from '../services/betService'
import './BettingHistory.css'

const BettingHistory = ({ user }) => {
  const [bets, setBets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    if (user) {
      fetchBettingHistory()
    }
  }, [user, statusFilter, currentPage])

  const fetchBettingHistory = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await betService.getBettingHistory(
        user.id, 
        statusFilter, 
        20, 
        currentPage * 20
      )
      
      if (currentPage === 0) {
        setBets(response.data)
      } else {
        setBets(prev => [...prev, ...response.data])
      }
      
      setHasMore(response.hasMore)
    } catch (err) {
      setError('Failed to load betting history')
      console.error('Error fetching betting history:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    setCurrentPage(prev => prev + 1)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatOdds = (odds) => {
    if (odds > 0) return `+${odds}`
    return `${odds}`
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'won': return '#28a745'
      case 'lost': return '#dc3545'
      case 'pending': return '#ffc107'
      case 'cancelled': return '#6c757d'
      default: return '#6c757d'
    }
  }

  const cancelBet = async (betId) => {
    try {
      await betService.cancelBet(betId, user.id)
      // Refresh the betting history
      setCurrentPage(0)
      fetchBettingHistory()
    } catch (err) {
      alert('Failed to cancel bet: ' + (err.response?.data?.error || err.message))
    }
  }

  if (!user) {
    return (
      <div className="betting-history-container">
        <div className="login-prompt">
          Please log in to view your betting history
        </div>
      </div>
    )
  }

  return (
    <div className="betting-history-container">
      <div className="history-header">
        <h2>Betting History</h2>
        <div className="status-filters">
          <button 
            className={statusFilter === 'all' ? 'active' : ''}
            onClick={() => setStatusFilter('all')}
          >
            All
          </button>
          <button 
            className={statusFilter === 'pending' ? 'active' : ''}
            onClick={() => setStatusFilter('pending')}
          >
            Pending
          </button>
          <button 
            className={statusFilter === 'won' ? 'active' : ''}
            onClick={() => setStatusFilter('won')}
          >
            Won
          </button>
          <button 
            className={statusFilter === 'lost' ? 'active' : ''}
            onClick={() => setStatusFilter('lost')}
          >
            Lost
          </button>
        </div>
      </div>

      {loading && bets.length === 0 ? (
        <div className="loading">Loading betting history...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : bets.length === 0 ? (
        <div className="no-bets">No bets found</div>
      ) : (
        <>
          <div className="bets-list">
            {bets.map((bet) => (
              <div key={bet.id} className="bet-card">
                <div className="bet-header">
                  <div className="bet-info">
                    <div className="game-matchup">
                      {bet.awayTeam} @ {bet.homeTeam}
                    </div>
                    <div className="bet-details">
                      <span className="bet-team">
                        Betting on: <strong>{bet.betType === 'home_win' ? bet.homeTeam : bet.awayTeam}</strong>
                      </span>
                      <span className="bet-odds">
                        Odds: <strong>{formatOdds(bet.odds)}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="bet-status">
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(bet.status) }}
                    >
                      {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
                    </span>
                  </div>
                </div>
                
                <div className="bet-amounts">
                  <div className="amount-row">
                    <span>Bet Amount:</span>
                    <strong>${bet.betAmount}</strong>
                  </div>
                  <div className="amount-row">
                    <span>Potential Payout:</span>
                    <strong>${bet.potentialPayout}</strong>
                  </div>
                  {bet.status === 'won' && (
                    <div className="amount-row profit">
                      <span>Profit:</span>
                      <strong>${(bet.potentialPayout - bet.betAmount).toFixed(2)}</strong>
                    </div>
                  )}
                </div>

                <div className="bet-meta">
                  <div className="bet-date">
                    Placed: {formatDate(bet.createdAt)}
                  </div>
                  <div className="event-date">
                    Event: {formatDate(bet.eventDate)}
                  </div>
                  {bet.status === 'pending' && new Date() < new Date(bet.eventDate) && (
                    <button 
                      className="cancel-btn"
                      onClick={() => cancelBet(bet.id)}
                    >
                      Cancel Bet
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="load-more">
              <button onClick={loadMore} disabled={loading}>
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default BettingHistory
