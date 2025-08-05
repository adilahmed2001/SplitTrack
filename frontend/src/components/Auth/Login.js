import { useState, useContext } from 'react';
import { login as loginAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate(); // Initialize navigate

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await loginAPI({ email, password });
      localStorage.setItem('token', response.data.token);
      login(response.data.user);
      navigate('/dashboard');
    } catch (error) {
      setErrorMessage('Login failed! Please check your credentials.');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start', // Align to the top
      height: '100vh',
      backgroundColor: '#f8f9fa',
      padding: '20px',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
      borderRadius: '8px',
      margin: '0 auto'
    }}>
      <h2 style={{
        marginBottom: '20px',
        color: '#007bff',
        fontSize: '1.5rem'
      }}>Login</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          padding: '10px',
          marginBottom: '10px',
          border: '1px solid #ccc',
          borderRadius: '5px',
          width: '100%',
          maxWidth: '300px'
        }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{
          padding: '10px',
          marginBottom: '10px',
          border: '1px solid #ccc',
          borderRadius: '5px',
          width: '100%',
          maxWidth: '300px'
        }}
      />
      <button type="submit" style={{
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer'
      }}>Login</button>
      {errorMessage && <p style={{ color: '#dc3545', marginTop: '10px' }}>{errorMessage}</p>}
      <p style={{
        marginTop: '10px',
        color: '#6c757d'
      }}>
        Don't have an account? <Link to="/signup" style={{ color: '#007bff' }}>Sign up here</Link>
      </p>
    </form>
  );
}

export default Login;