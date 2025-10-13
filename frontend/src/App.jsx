import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import loginService from './services/loginService'
import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [count, setCount] = useState(0)

  const handleLogin = async ({ username, password }) => {
    try {
        const user = await loginService.login({
            username,
            password
        })
        window.localStorage.setItem('loggedNoteAppUser', JSON.stringify(user))
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
          window.localStorage.setItem('loggedNoteAppUser', JSON.stringify(user))
          // noteService.setToken(user.token)
          setUser(user)
      }
      catch (err) {
          console.log('could not register')
          throw err
      }
  }

  const handleLogout = () => {
      window.localStorage.removeItem('loggedNoteAppUser')
      setUser(null)
  }

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      <div>
        {!user && <LoginForm onLogin={handleLogin} />}
        {!user && <RegisterForm onRegister={handleRegister} />}
        {user && <button onClick={handleLogout}>Logout</button>}
      </div>
    </>
  )
}

export default App
