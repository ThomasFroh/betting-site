import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import OddsTable from './components/OddsTable'
import BettingHistory from './components/BettingHistory'
import AdminPanel from './components/AdminPanel'
import loginService from './services/loginService'
import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('odds')

  // Check for saved session on mount
  useEffect(() => {
    const loggedUserJSON = window.localStorage.getItem('loggedBettingAppUser')
    if (loggedUserJSON) {
      const user = JSON.parse(loggedUserJSON)
      setUser(user)
    }
  }, [])

  const handleLogin = async ({ username, password }) => {
    try {
        const user = await loginService.login({
            username,
            password
        })
        window.localStorage.setItem('loggedBettingAppUser', JSON.stringify(user))
        // noteService.setToken(user.token)
        setUser(user)
    } catch (err) {
        console.log('could not login')
        throw err
    }
}

  const handleRegister = async ({ id, username, password }) => {
      try {
          const user = await loginService.register({ id, username, password })
          window.localStorage.setItem('loggedBettingAppUser', JSON.stringify(user))
          // noteService.setToken(user.token)
          setUser(user)
      }
      catch (err) {
          console.log('could not register')
          throw err
      }
  }

  const handleLogout = () => {
      window.localStorage.removeItem('loggedBettingAppUser')
      setUser(null)
      setActiveTab('odds') // Reset to default tab
  }

  // If user is not logged in, show only login/register forms
  if (!user) {
    return (
      <div className="auth-container">
        <div className="app-header">
          <h1>🎰 Sports Betting Hub</h1>
          <p>Please login or register to continue</p>
        </div>
        <div className="auth-section">
          <LoginForm onLogin={handleLogin} />
          <RegisterForm onRegister={handleRegister} />
        </div>
      </div>
    )
  }

  // If user is logged in, show the full app
  return (
    <>
      <div className="app-header">
        <h1>🎰 Sports Betting Hub</h1>
        <div className="auth-section">
          <div className="user-info">
            <span>Welcome, {user.username}!</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </div>
      
      <div className="main-navigation">
        <button 
          className={activeTab === 'odds' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveTab('odds')}
        >
          Available Bets
        </button>
        <button 
          className={activeTab === 'history' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveTab('history')}
        >
          My Bets
        </button>
        {user.role === 'admin' && (
          <button 
            className={activeTab === 'admin' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveTab('admin')}
          >
            Admin Panel
          </button>
        )}
      </div>
      
      {activeTab === 'odds' && <OddsTable user={user} />}
      {activeTab === 'history' && <BettingHistory user={user} />}
      {activeTab === 'admin' && user.role === 'admin' && <AdminPanel />}
    </>
  )
}

export default App
