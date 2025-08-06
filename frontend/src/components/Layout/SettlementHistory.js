import React, { useEffect, useState } from 'react';
import { Typography, Box, CircularProgress } from '@mui/material';

const backendBaseUrl = 'http://localhost:5000/api';

function SettlementHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${backendBaseUrl}/expenses/settled_history`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (!res.ok) throw new Error('Failed to fetch history');
        const data = await res.json();
        setHistory(data.settled_expenses || []);
      } catch (err) {
        setError('Could not load settlement history');
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  return (
    <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2, boxShadow: 1, minWidth: 320 }}>
      <Typography variant="h6" sx={{ mb: 2, color: '#007bff' }}>Settlement History</Typography>
      {loading ? (
        <CircularProgress size={24} />
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : history.length === 0 ? (
        <Typography>No settlements yet.</Typography>
      ) : (
        history.map(item => (
          <Box key={item.expense_id + item.settled_at} sx={{ mb: 2, p: 1, borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="body2" sx={{ color: '#333' }}>
              <b>{item.description}</b> settled for <b>${item.amount}</b> by <b>{item.paid_by.name}</b> ({item.paid_by.email})
            </Typography>
            <Typography variant="caption" sx={{ color: '#6c757d' }}>
              {new Date(item.settled_at).toLocaleString()}
            </Typography>
          </Box>
        ))
      )}
    </Box>
  );
}

export default SettlementHistory;
