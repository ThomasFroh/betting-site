import { useState } from 'react';
import { Form, Button } from 'react-bootstrap';

const LoginForm = ({ onLogin }) => {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        await onLogin({ username, password })
        setUsername('')
        setPassword('')
    }

    return (
        <div>
            <h2>Login</h2>
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
                <Button type="submit">Login</Button>
            </Form>
        </div>
    )
}

export default LoginForm;

