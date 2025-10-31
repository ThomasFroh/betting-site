import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import OddsTable from './components/OddsTable'
import BettingHistory from './components/BettingHistory'
import AdminPanel from './components/AdminPanel'
import loginService from './services/loginService'
import { useState } from 'react'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('odds')

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
  }

  return (
    <>
      <div className="app-header">
        <h1>🎰 Sports Betting Hub</h1>
        <div className="auth-section">
          {!user && <LoginForm onLogin={handleLogin} />}
          {!user && <RegisterForm onRegister={handleRegister} />}
          {user && (
            <div className="user-info">
              <span>Welcome, {user.username}!</span>
              <button onClick={handleLogout} className="logout-btn">Logout</button>
            </div>
          )}
        </div>
      </div>
      
      {user && (
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
      )}
      
      {activeTab === 'odds' && <OddsTable user={user} />}
      {activeTab === 'history' && <BettingHistory user={user} />}
      {activeTab === 'admin' && user.role === 'admin' && <AdminPanel />}
    </>
  )
}

export default App
