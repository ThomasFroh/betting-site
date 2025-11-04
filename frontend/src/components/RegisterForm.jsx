import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './RegisterForm.css';

const RegisterForm = ({ onRegister }) => {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        
        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long')
            return
        }

        setIsSubmitting(true)
        try {
            await onRegister({ id: uuidv4(), username, password })
            setUsername('')
            setPassword('')
            setConfirmPassword('')
        } catch (error) {
            console.error('Registration failed:', error)
            setError('Registration failed. Username may already be taken.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="auth-form-card">
            <div className="auth-form-header">
                <h2>Create Account</h2>
                <p>Join us today and start betting!</p>
            </div>
            <form onSubmit={handleSubmit} className="auth-form">
                {error && <div className="form-error">{error}</div>}
                <div className="form-group">
                    <label htmlFor="register-username">Username</label>
                    <input
                        id="register-username"
                        type="text"
                        value={username}
                        onChange={({ target }) => setUsername(target.value)}
                        placeholder="Choose a username"
                        required
                        disabled={isSubmitting}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="register-password">Password</label>
                    <input
                        id="register-password"
                        type="password"
                        value={password}
                        onChange={({ target }) => setPassword(target.value)}
                        placeholder="Create a password (min 6 characters)"
                        required
                        disabled={isSubmitting}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="register-confirm-password">Confirm Password</label>
                    <input
                        id="register-confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={({ target }) => setConfirmPassword(target.value)}
                        placeholder="Confirm your password"
                        required
                        disabled={isSubmitting}
                    />
                </div>
                <button 
                    type="submit" 
                    className="auth-submit-btn"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Creating Account...' : 'Register'}
                </button>
            </form>
        </div>
    )
}

export default RegisterForm;

