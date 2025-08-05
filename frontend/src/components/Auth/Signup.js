import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup as signupAPI } from '../../services/api';

function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate(); // Initialize navigate

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signupAPI({ name, email, password });
      navigate('/login'); // Redirect to login page
    } catch (error) {
      setErrorMessage('Signup failed! Please try again.');
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
      }}>Signup</h2>
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
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
      }}>Signup</button>
      {errorMessage && <p style={{ color: '#dc3545', marginTop: '10px' }}>{errorMessage}</p>}
      <p style={{
        marginTop: '10px',
        color: '#6c757d'
      }}>
        Already have an account? <Link to="/login" style={{ color: '#007bff' }}>Login here</Link>
      </p>
    </form>
  );
}

export default Signup;