import { useState, useEffect, useCallback } from 'react'
import predictionService from '../services/predictionService'
import betService from '../services/betService'
import './Predictions.css'

const MIN_STAKE = 1
const MAX_STAKE = 10000

const formatMoney = (value) => `$${Number(value || 0).toFixed(2)}`

const estimatePayout = (stake, sidePot, totalPot) => {
  const amount = Number(stake)
  const side = Number(sidePot) + amount
  const pot = Number(totalPot) + amount
  if (!amount || side <= 0) return 0
  // One-sided after your bet would refund stake only at resolve time for that side —
  // but live estimate assumes current + your stake shares full pot
  return (amount / side) * pot
}

const Predictions = ({ user }) => {
  const [predictions, setPredictions] = useState([])
  const [filter, setFilter] = useState('active') // active = open+locked, or specific
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [balance, setBalance] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ title: '', optionA: '', optionB: '' })
  const [creating, setCreating] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [stakeOption, setStakeOption] = useState('A')
  const [stakeAmount, setStakeAmount] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const loadBalance = useCallback(async () => {
    try {
      const result = await betService.getUserBalance(user.id)
      setBalance(result.balance ?? result.data?.balance ?? result)
    } catch {
      // Balance is optional for browsing
    }
  }, [user.id])

  const loadPredictions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let statusParam
      if (filter === 'active') statusParam = undefined // API defaults to open+locked
      else statusParam = filter

      const result = await predictionService.listPredictions(statusParam)
      setPredictions(result.data || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load predictions')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadPredictions()
    loadBalance()
  }, [loadPredictions, loadBalance])

  const myEntry = (prediction) =>
    (prediction.entries || []).find(
      (e) => e.userId === user.id && e.status !== 'refunded'
    )

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    setActionError('')
    try {
      const result = await predictionService.createPrediction(createForm)
      setShowCreate(false)
      setCreateForm({ title: '', optionA: '', optionB: '' })
      await loadPredictions()
      if (result.data?.id) setSelectedId(result.data.id)
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to create prediction')
    } finally {
      setCreating(false)
    }
  }

  const refreshAfterAction = async (updated) => {
    if (updated?.data) {
      setPredictions((prev) => {
        const idx = prev.findIndex((p) => p.id === updated.data.id)
        if (idx === -1) return prev
        const next = [...prev]
        next[idx] = updated.data
        return next
      })
    } else {
      await loadPredictions()
    }
    await loadBalance()
  }

  const handleEnter = async (predictionId) => {
    setActionLoading(true)
    setActionError('')
    try {
      const amount = parseFloat(stakeAmount)
      if (!Number.isFinite(amount) || amount < MIN_STAKE) {
        setActionError(`Minimum stake is $${MIN_STAKE}`)
        return
      }
      if (amount > MAX_STAKE) {
        setActionError(`Maximum stake is $${MAX_STAKE}`)
        return
      }
      if (balance != null && amount > Number(balance)) {
        setActionError('Insufficient balance')
        return
      }
      const result = await predictionService.enterPrediction(predictionId, {
        option: stakeOption,
        amount
      })
      if (result.newBalance != null) setBalance(result.newBalance)
      setStakeAmount('')
      await refreshAfterAction(result)
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to place stake')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelEntry = async (predictionId) => {
    setActionLoading(true)
    setActionError('')
    try {
      const result = await predictionService.cancelEntry(predictionId)
      if (result.newBalance != null) setBalance(result.newBalance)
      await refreshAfterAction(result)
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to cancel entry')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLock = async (predictionId) => {
    setActionLoading(true)
    setActionError('')
    try {
      const result = await predictionService.lockPrediction(predictionId)
      await refreshAfterAction(result)
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to lock')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResolve = async (predictionId, winningOption) => {
    if (!window.confirm(`Resolve with option ${winningOption} as the winner?`)) return
    setActionLoading(true)
    setActionError('')
    try {
      const result = await predictionService.resolvePrediction(predictionId, winningOption)
      await refreshAfterAction(result)
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to resolve')
    } finally {
      setActionLoading(false)
    }
  }

  const handleVoid = async (predictionId) => {
    if (!window.confirm('Void this prediction and refund all stakes?')) return
    setActionLoading(true)
    setActionError('')
    try {
      const result = await predictionService.voidPrediction(predictionId)
      await refreshAfterAction(result)
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to void')
    } finally {
      setActionLoading(false)
    }
  }

  const renderPotBar = (prediction) => {
    const a = prediction.percentA ?? 50
    const b = prediction.percentB ?? 50
    return (
      <div className="prediction-pot-bar">
        <div className="pot-fill pot-a" style={{ width: `${a}%` }}>
          {a >= 12 && <span>{a}%</span>}
        </div>
        <div className="pot-fill pot-b" style={{ width: `${b}%` }}>
          {b >= 12 && <span>{b}%</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="predictions-container">
      <div className="predictions-header">
        <div>
          <h2>Friend Predictions</h2>
          {balance != null && (
            <p className="predictions-balance">Balance: {formatMoney(balance)}</p>
          )}
        </div>
        <div className="predictions-header-actions">
          <div className="status-filters">
            <button
              className={filter === 'active' ? 'active' : ''}
              onClick={() => setFilter('active')}
            >
              Open
            </button>
            <button
              className={filter === 'resolved' ? 'active' : ''}
              onClick={() => setFilter('resolved')}
            >
              Resolved
            </button>
            <button
              className={filter === 'voided' ? 'active' : ''}
              onClick={() => setFilter('voided')}
            >
              Voided
            </button>
            <button
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              All
            </button>
          </div>
          <button className="create-prediction-btn" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? 'Cancel' : 'New Prediction'}
          </button>
        </div>
      </div>

      {showCreate && (
        <form className="create-prediction-form" onSubmit={handleCreate}>
          <h3>Create Prediction</h3>
          <label>
            Title
            <input
              type="text"
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              placeholder="Will the Packers win on Sunday?"
              maxLength={200}
              required
            />
          </label>
          <div className="create-options-row">
            <label>
              Option A
              <input
                type="text"
                value={createForm.optionA}
                onChange={(e) => setCreateForm({ ...createForm, optionA: e.target.value })}
                placeholder="Yes"
                maxLength={100}
                required
              />
            </label>
            <label>
              Option B
              <input
                type="text"
                value={createForm.optionB}
                onChange={(e) => setCreateForm({ ...createForm, optionB: e.target.value })}
                placeholder="No"
                maxLength={100}
                required
              />
            </label>
          </div>
          {actionError && showCreate && <p className="prediction-error">{actionError}</p>}
          <button type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create'}
          </button>
        </form>
      )}

      {loading && <div className="loading">Loading predictions…</div>}
      {error && <div className="error">{error}</div>}
      {!loading && !error && predictions.length === 0 && (
        <div className="no-bets">No predictions yet. Create one for your friends.</div>
      )}

      <div className="predictions-list">
        {predictions.map((prediction) => {
          const entry = myEntry(prediction)
          const isCreator = prediction.creatorId === user.id
          const isSelected = selectedId === prediction.id
          const sidePot =
            stakeOption === 'A' ? prediction.potA : prediction.potB
          const est =
            stakeAmount && prediction.status === 'open' && !entry
              ? estimatePayout(stakeAmount, sidePot, prediction.totalPot)
              : null

          return (
            <div
              key={prediction.id}
              className={`prediction-card status-${prediction.status}${isSelected ? ' selected' : ''}`}
            >
              <div
                className="prediction-card-main"
                onClick={() => {
                  setSelectedId(isSelected ? null : prediction.id)
                  setActionError('')
                  setStakeOption('A')
                  setStakeAmount('')
                }}
              >
                <div className="prediction-card-top">
                  <h3>{prediction.title}</h3>
                  <span className={`prediction-status badge-${prediction.status}`}>
                    {prediction.status}
                  </span>
                </div>
                {renderPotBar(prediction)}
                <div className="prediction-options-summary">
                  <span className="opt-a">
                    {prediction.optionA}: {formatMoney(prediction.potA)} ({prediction.percentA}%)
                  </span>
                  <span className="opt-b">
                    {prediction.optionB}: {formatMoney(prediction.potB)} ({prediction.percentB}%)
                  </span>
                </div>
                <div className="prediction-meta">
                  <span>Pot: {formatMoney(prediction.totalPot)}</span>
                  {prediction.winningOption && (
                    <span>
                      Winner:{' '}
                      {prediction.winningOption === 'A'
                        ? prediction.optionA
                        : prediction.optionB}
                    </span>
                  )}
                  {entry && (
                    <span>
                      Your pick: {entry.option === 'A' ? prediction.optionA : prediction.optionB}{' '}
                      ({formatMoney(entry.amount)})
                      {entry.status === 'won' && ` · Won ${formatMoney(entry.payout)}`}
                      {entry.status === 'lost' && ' · Lost'}
                    </span>
                  )}
                </div>
              </div>

              {isSelected && (
                <div className="prediction-detail" onClick={(e) => e.stopPropagation()}>
                  {actionError && <p className="prediction-error">{actionError}</p>}

                  {prediction.status === 'open' && !entry && (
                    <div className="enter-form">
                      <div className="option-pick">
                        <button
                          type="button"
                          className={stakeOption === 'A' ? 'active opt-a' : 'opt-a'}
                          onClick={() => setStakeOption('A')}
                        >
                          {prediction.optionA}
                        </button>
                        <button
                          type="button"
                          className={stakeOption === 'B' ? 'active opt-b' : 'opt-b'}
                          onClick={() => setStakeOption('B')}
                        >
                          {prediction.optionB}
                        </button>
                      </div>
                      <div className="stake-row">
                        <input
                          type="number"
                          min={MIN_STAKE}
                          max={MAX_STAKE}
                          step="1"
                          placeholder="Stake amount"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                        />
                        <div className="quick-stakes">
                          {[5, 10, 25, 50].map((n) => (
                            <button key={n} type="button" onClick={() => setStakeAmount(String(n))}>
                              ${n}
                            </button>
                          ))}
                          {balance != null && (
                            <button
                              type="button"
                              onClick={() =>
                                setStakeAmount(
                                  String(Math.min(MAX_STAKE, Math.floor(Number(balance))))
                                )
                              }
                            >
                              Max
                            </button>
                          )}
                        </div>
                      </div>
                      {est != null && Number(stakeAmount) >= MIN_STAKE && (
                        <p className="est-payout">
                          Est. payout if you win: {formatMoney(est)}
                        </p>
                      )}
                      <button
                        type="button"
                        className="primary-action"
                        disabled={actionLoading || !stakeAmount}
                        onClick={() => handleEnter(prediction.id)}
                      >
                        {actionLoading ? 'Placing…' : 'Place Stake'}
                      </button>
                    </div>
                  )}

                  {prediction.status === 'open' && entry && (
                    <div className="entry-actions">
                      <p>
                        You are on{' '}
                        <strong>
                          {entry.option === 'A' ? prediction.optionA : prediction.optionB}
                        </strong>{' '}
                        for {formatMoney(entry.amount)}.
                      </p>
                      <button
                        type="button"
                        className="secondary-action"
                        disabled={actionLoading}
                        onClick={() => handleCancelEntry(prediction.id)}
                      >
                        Cancel Entry
                      </button>
                    </div>
                  )}

                  {isCreator && (prediction.status === 'open' || prediction.status === 'locked') && (
                    <div className="creator-controls">
                      <h4>Creator controls</h4>
                      {prediction.status === 'open' && (
                        <button
                          type="button"
                          className="secondary-action"
                          disabled={actionLoading}
                          onClick={() => handleLock(prediction.id)}
                        >
                          Lock Betting
                        </button>
                      )}
                      <div className="resolve-row">
                        <button
                          type="button"
                          className="resolve-a"
                          disabled={actionLoading}
                          onClick={() => handleResolve(prediction.id, 'A')}
                        >
                          {prediction.optionA} Wins
                        </button>
                        <button
                          type="button"
                          className="resolve-b"
                          disabled={actionLoading}
                          onClick={() => handleResolve(prediction.id, 'B')}
                        >
                          {prediction.optionB} Wins
                        </button>
                      </div>
                      <button
                        type="button"
                        className="void-action"
                        disabled={actionLoading}
                        onClick={() => handleVoid(prediction.id)}
                      >
                        Void &amp; Refund All
                      </button>
                    </div>
                  )}

                  {(prediction.entries || []).length > 0 && (
                    <div className="entries-list">
                      <h4>Entries</h4>
                      <ul>
                        {(prediction.entries || [])
                          .filter((e) => e.status !== 'refunded' || prediction.status === 'voided')
                          .map((e) => (
                            <li key={e.id}>
                              <span>{e.userId === user.id ? 'You' : e.userId.slice(0, 8)}</span>
                              <span>
                                {e.option === 'A' ? prediction.optionA : prediction.optionB}
                              </span>
                              <span>{formatMoney(e.amount)}</span>
                              <span className={`entry-status-${e.status}`}>{e.status}</span>
                              {e.status === 'won' && <span>{formatMoney(e.payout)}</span>}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Predictions
