import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Form, Button } from 'react-bootstrap';

const RegisterForm = ({ onRegister }) => {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            alert('Passwords do not match')
            return
        }
        await onRegister({ id: uuidv4(), username, password })
        setUsername('')
        setPassword('')
        setConfirmPassword('')
    }

    return (
        <div>
            <h2>Register</h2>
            <Form onSubmit={handleSubmit}>
                <Form.Group>
                    <Form.Label>Username:</Form.Label>
                    <Form.Control 
                        type="text" 
                        value={username} 
                        onChange={({ target }) => setUsername(target.value)} 
                        required
                    />
                </Form.Group>
                <Form.Group>
                    <Form.Label>Password:</Form.Label>
                    <Form.Control 
                        type="password" 
                        value={password} 
                        onChange={({ target }) => setPassword(target.value)} 
                        required
                    />
                </Form.Group>
                <Form.Group>
                    <Form.Label>Confirm Password:</Form.Label>
                    <Form.Control 
                        type="password" 
                        value={confirmPassword} 
                        onChange={({ target }) => setConfirmPassword(target.value)} 
                        required
                    />
                </Form.Group>
                <Button type="submit">Register</Button>
            </Form>
        </div>
    )
}

export default RegisterForm;

