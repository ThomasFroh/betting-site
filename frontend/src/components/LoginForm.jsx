import { useState } from 'react';
import './LoginForm.css';

const LoginForm = ({ onLogin }) => {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            await onLogin({ username, password })
            setUsername('')
            setPassword('')
        } catch (error) {
            console.error('Login failed:', error)
            alert('Invalid username or password')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="auth-form-card">
            <div className="auth-form-header">
                <h2>Login</h2>
                <p>Welcome back! Please login to your account.</p>
            </div>
            <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                    <label htmlFor="login-username">Username</label>
                    <input
                        id="login-username"
                        type="text"
                        value={username}
                        onChange={({ target }) => setUsername(target.value)}
                        placeholder="Enter your username"
                        required
                        disabled={isSubmitting}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="login-password">Password</label>
                    <input
                        id="login-password"
                        type="password"
                        value={password}
                        onChange={({ target }) => setPassword(target.value)}
                        placeholder="Enter your password"
                        required
                        disabled={isSubmitting}
                    />
                </div>
                <button 
                    type="submit" 
                    className="auth-submit-btn"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Logging in...' : 'Login'}
                </button>
            </form>
        </div>
    )
}

export default LoginForm;

