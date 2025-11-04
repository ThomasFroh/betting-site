import { useState, useEffect } from 'react'
import betService from '../services/betService'
import './BetForm.css'

const BetForm = ({ 
  event, 
  selectedOutcome, 
  onBetPlaced, 
  onClose, 
  userId, 
  userBalance 
}) => {
  const [betAmount, setBetAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [potentialPayout, setPotentialPayout] = useState(0)

  useEffect(() => {
    if (betAmount && selectedOutcome) {
      calculatePayout()
    }
  }, [betAmount, selectedOutcome])

  const calculatePayout = () => {
    const amount = parseFloat(betAmount)
    if (!amount || !selectedOutcome) return

    let payout
    if (selectedOutcome.price > 0) {
      // Positive odds: payout = betAmount + (betAmount * odds / 100)
      payout = amount + (amount * selectedOutcome.price / 100)
    } else {
      // Negative odds: payout = betAmount + (betAmount * 100 / |odds|)
      payout = amount + (amount * 100 / Math.abs(selectedOutcome.price))
    }
    setPotentialPayout(payout)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const amount = parseFloat(betAmount)
      
      if (amount <= 0) {
        setError('Bet amount must be greater than 0')
        return
      }

      if (amount > parseFloat(userBalance || 0)) {
        setError('Insufficient balance')
        return
      }

      if (amount < 1) {
        setError('Minimum bet amount is $1.00')
        return
      }

      const betData = {
        userId,
        eventId: event.id,
        sport: event.sport_key,
        homeTeam: event.home_team,
        awayTeam: event.away_team,
        betType: selectedOutcome.name === event.home_team ? 'home_win' : 'away_win',
        betAmount: amount,
        odds: selectedOutcome.price,
        eventDate: event.commence_time
      }

      const result = await betService.placeBet(betData)
      
      if (onBetPlaced) {
        onBetPlaced(result)
      }
      
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to place bet')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickBet = (amount) => {
    setBetAmount(amount.toString())
  }

  if (!selectedOutcome || !event) {
    return null
  }

  return (
    <div className="bet-form-overlay">
      <div className="bet-form-container">
        <div className="bet-form-header">
          <h3>Place Your Bet</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="bet-details">
          <div className="game-info">
            <strong>{event.away_team} @ {event.home_team}</strong>
            <div className="bet-selection">
              Betting on: <strong>{selectedOutcome.name}</strong>
            </div>
            <div className="odds-display">
              Odds: <span className={`odds ${selectedOutcome.price > 0 ? 'positive' : 'negative'}`}>
                {selectedOutcome.price > 0 ? `+${selectedOutcome.price}` : selectedOutcome.price}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bet-form">
          <div className="form-group">
            <label htmlFor="betAmount">Bet Amount</label>
            <div className="input-group">
              <span className="currency">$</span>
              <input
                type="number"
                id="betAmount"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                step="0.01"
                min="1"
                max={userBalance}
                placeholder="Enter amount"
                required
              />
            </div>
            <div className="balance-info">
              Available Balance: <strong>${parseFloat(userBalance || 0).toFixed(2)}</strong>
            </div>
          </div>

          <div className="quick-bet-buttons">
            <button type="button" onClick={() => handleQuickBet(5)}>$5</button>
            <button type="button" onClick={() => handleQuickBet(10)}>$10</button>
            <button type="button" onClick={() => handleQuickBet(25)}>$25</button>
            <button type="button" onClick={() => handleQuickBet(50)}>$50</button>
            <button type="button" onClick={() => handleQuickBet(parseFloat(userBalance || 0))}>Max</button>
          </div>

          {potentialPayout > 0 && (
            <div className="payout-info">
              <div className="payout-row">
                <span>Potential Payout:</span>
                <strong>${potentialPayout.toFixed(2)}</strong>
              </div>
              <div className="payout-row">
                <span>Profit:</span>
                <strong>${(potentialPayout - parseFloat(betAmount || 0)).toFixed(2)}</strong>
              </div>
            </div>
          )}

          {error && (
            <div className="error-message">{error}</div>
          )}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button 
              type="submit" 
              className="place-bet-btn"
              disabled={loading || !betAmount || parseFloat(betAmount) <= 0}
            >
              {loading ? 'Placing Bet...' : 'Place Bet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default BetForm
