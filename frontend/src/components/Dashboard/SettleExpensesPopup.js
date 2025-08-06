import React, { useEffect, useState } from 'react';

const backendBaseUrl = 'http://localhost:5000/api';

function SettleExpensesPopup({ open, onClose, onSettleSuccess }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (open) {
      setSelectedExpense(null);
      setSettleAmount('');
      setError('');
      setSuccess('');
      setLoading(true);
      fetch(`${backendBaseUrl}/expenses/active_expenses`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          setExpenses(data.active_expenses || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [open]);

  const handleRowClick = (expense) => {
    setSelectedExpense(expense);
    setSettleAmount('');
    setError('');
    setSuccess('');
  };

  const handleBack = () => {
    setSelectedExpense(null);
    setSettleAmount('');
    setError('');
    setSuccess('');
  };

  const handleSettle = async () => {
    setError('');
    setSuccess('');
    if (!settleAmount || isNaN(settleAmount)) {
      setError('Enter a valid amount');
      return;
    }
    const amount = parseFloat(settleAmount);
    if (amount <= 0 || amount > selectedExpense.amount) {
      setError('Amount must be > 0 and <= current amount');
      return;
    }
    try {
      const res = await fetch(`${backendBaseUrl}/expenses/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ expense_id: selectedExpense.expense_id, amount }),
      });
      if (res.ok) {
        setSuccess('Expense settled!');
        if (typeof onSettleSuccess === 'function') {
          onSettleSuccess();
        }
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setError('Failed to settle expense');
      }
    } catch {
      setError('Failed to settle expense');
    }
  };

  if (!open) return null;

  // Split expenses by role
  const youOwe = expenses.filter(e => e.role === 'participant');
  const youAreOwed = expenses.filter(e => e.role === 'payer');

  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, background: '#fff', borderTop: '2px solid #007bff', zIndex: 2000, boxShadow: '0 -2px 16px rgba(0,0,0,0.08)', padding: 24, minHeight: 400 }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 8, right: 16, background: 'transparent', border: 'none', fontSize: 24, cursor: 'pointer' }}>&times;</button>
      <h2 style={{ marginBottom: 16, color: '#007bff' }}>Settle Expenses</h2>
      {loading ? (
        <p>Loading...</p>
      ) : selectedExpense ? (
        <div style={{ maxWidth: 480, margin: '40px auto', background: '#fff', borderRadius: 18, boxShadow: '0 6px 32px rgba(0,0,0,0.10)', padding: '36px 32px 28px 32px', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <h2 style={{ color: '#222', fontWeight: 700, marginBottom: 24, letterSpacing: 0.5, textAlign: 'left' }}>Expense Details</h2>
          <div style={{ width: '100%', marginBottom: 18, display: 'grid', gridTemplateColumns: '160px 1fr', rowGap: 12, columnGap: 12, textAlign: 'left' }}>
            <span style={{ fontWeight: 600, color: '#555' }}>Expense ID:</span>
            <span style={{ color: '#222' }}>{selectedExpense.expense_id}</span>
            <span style={{ fontWeight: 600, color: '#555' }}>Type:</span>
            <span style={{ color: '#007bff', fontWeight: 600 }}>{selectedExpense.type}</span>
            <span style={{ fontWeight: 600, color: '#555' }}>Description:</span>
            <span style={{ color: '#333' }}>{selectedExpense.description}</span>
            <span style={{ fontWeight: 600, color: '#555' }}>Amount:</span>
            <span style={{ color: '#28a745', fontWeight: 700 }}>${selectedExpense.amount}</span>
            <span style={{ fontWeight: 600, color: '#555' }}>User Name:</span>
            <span style={{ color: '#007bff', fontWeight: 600 }}>{selectedExpense.user.name}</span>
            <span style={{ fontWeight: 600, color: '#555' }}>User Email:</span>
            <span style={{ color: '#007bff', fontWeight: 600 }}>{selectedExpense.user.email}</span>
            <span style={{ fontWeight: 600, color: '#555' }}>Role:</span>
            <span style={{ color: selectedExpense.role === 'participant' ? '#dc3545' : '#28a745', fontWeight: 700 }}>{selectedExpense.role === 'participant' ? 'You Owe' : 'You Are Owed'}</span>
          </div>
          {/* Divider */}
          <div style={{ width: '100%', height: 1, background: '#f1f3f6', margin: '18px 0 18px 0' }} />
          {/* Always show settle input for participant role (i.e., when you owe) */}
          {selectedExpense.role === 'participant' ? (
            <>
              <div style={{ width: '100%', marginBottom: 18 }}>
                <label style={{ fontWeight: 600, color: '#555', marginRight: 10 }}>Settle Amount:</label>
                <input
                  type="number"
                  value={settleAmount}
                  min={0.01}
                  max={selectedExpense.amount}
                  step={0.01}
                  onChange={e => {
                    let val = e.target.value;
                    if (val === '' || isNaN(val)) setSettleAmount('');
                    else setSettleAmount(val);
                  }}
                  style={{ padding: '10px 16px', borderRadius: 8, border: '1.5px solid #007bff', width: 160, fontSize: 18, outline: 'none', marginLeft: 4, fontWeight: 600, color: '#222' }}
                />
              </div>
              {settleAmount && !isNaN(settleAmount) && parseFloat(settleAmount) > 0 && parseFloat(settleAmount) <= selectedExpense.amount && (
                <p style={{ color: '#555', fontWeight: 500, marginBottom: 10 }}>Remaining after settle: <b style={{ color: '#28a745' }}>${(selectedExpense.amount - parseFloat(settleAmount)).toFixed(2)}</b></p>
              )}
              {/* Show invalid message if amount is not valid */}
              {settleAmount && (!isFinite(settleAmount) || parseFloat(settleAmount) <= 0 || parseFloat(settleAmount) > selectedExpense.amount) && (
                <p style={{ color: '#dc3545', fontWeight: 600, marginBottom: 10 }}>Invalid amount</p>
              )}
              {error && <p style={{ color: '#dc3545', fontWeight: 600 }}>{error}</p>}
              {success && <p style={{ color: '#28a745', fontWeight: 600 }}>{success}</p>}
              <div style={{ marginTop: 18, width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={handleBack} style={{ padding: '10px 32px', borderRadius: 8, border: 'none', background: '#6c757d', color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>Back</button>
                <button
                  onClick={handleSettle}
                  style={{
                    padding: '10px 32px',
                    borderRadius: 8,
                    border: 'none',
                    background: !(settleAmount && !isNaN(settleAmount) && parseFloat(settleAmount) > 0 && parseFloat(settleAmount) <= selectedExpense.amount) ? '#bdbdbd' : '#4caf50',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: 16,
                    letterSpacing: 0.5,
                    boxShadow: '0 2px 8px rgba(44, 203, 112, 0.10)',
                    opacity: !(settleAmount && !isNaN(settleAmount) && parseFloat(settleAmount) > 0 && parseFloat(settleAmount) <= selectedExpense.amount) ? 0.6 : 1,
                    cursor: !(settleAmount && !isNaN(settleAmount) && parseFloat(settleAmount) > 0 && parseFloat(settleAmount) <= selectedExpense.amount) ? 'not-allowed' : 'pointer',
                  }}
                  disabled={!(settleAmount && !isNaN(settleAmount) && parseFloat(settleAmount) > 0 && parseFloat(settleAmount) <= selectedExpense.amount)}
                >
                  Settle
                </button>
              </div>
            </>
          ) : (
            <div style={{ marginTop: 18, width: '100%', display: 'flex', justifyContent: 'center' }}>
              <button onClick={handleBack} style={{ padding: '10px 32px', borderRadius: 8, border: 'none', background: '#6c757d', color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>Back</button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
          {/* You Owe Table */}
          <div style={{ flex: 1, minWidth: 320 }}>
            <h3 style={{ color: '#dc3545' }}>You Owe</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
              <thead>
                <tr style={{ background: '#f1f3f6' }}>
                  <th style={{ padding: 8, border: '1px solid #ccc' }}>Expense ID</th>
                  <th style={{ padding: 8, border: '1px solid #ccc' }}>Type</th>
                  <th style={{ padding: 8, border: '1px solid #ccc' }}>Description</th>
                  <th style={{ padding: 8, border: '1px solid #ccc' }}>Amount</th>
                  <th style={{ padding: 8, border: '1px solid #ccc' }}>Email</th>
                </tr>
              </thead>
              <tbody>
                {youOwe.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 16 }}>No expenses</td></tr>
                ) : youOwe.map(exp => (
                  <tr
                    key={exp.expense_id}
                    style={{ cursor: 'pointer', transition: 'background 0.15s', userSelect: 'none' }}
                    onClick={() => handleRowClick(exp)}
                    onMouseOver={e => (e.currentTarget.style.background = '#f5faff')}
                    onMouseOut={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: 8, border: '1px solid #ccc' }}>{exp.expense_id}</td>
                    <td style={{ padding: 8, border: '1px solid #ccc' }}>{exp.type}</td>
                    <td style={{ padding: 8, border: '1px solid #ccc' }}>{exp.description}</td>
                    <td style={{ padding: 8, border: '1px solid #ccc' }}>${exp.amount}</td>
                    <td style={{ padding: 8, border: '1px solid #ccc' }}>{exp.user.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* You Are Owed Table */}
          <div style={{ flex: 1, minWidth: 320 }}>
            <h3 style={{ color: '#28a745' }}>You Are Owed</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
              <thead>
                <tr style={{ background: '#f1f3f6' }}>
                  <th style={{ padding: 8, border: '1px solid #ccc' }}>Expense ID</th>
                  <th style={{ padding: 8, border: '1px solid #ccc' }}>Type</th>
                  <th style={{ padding: 8, border: '1px solid #ccc' }}>Description</th>
                  <th style={{ padding: 8, border: '1px solid #ccc' }}>Amount</th>
                  <th style={{ padding: 8, border: '1px solid #ccc' }}>Email</th>
                </tr>
              </thead>
              <tbody>
                {youAreOwed.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 16 }}>No expenses</td></tr>
                ) : youAreOwed.map(exp => (
                  <tr
                    key={exp.expense_id}
                    style={{ cursor: 'pointer', transition: 'background 0.15s', userSelect: 'none' }}
                    onClick={() => handleRowClick(exp)}
                    onMouseOver={e => (e.currentTarget.style.background = '#f5faff')}
                    onMouseOut={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: 8, border: '1px solid #ccc' }}>{exp.expense_id}</td>
                    <td style={{ padding: 8, border: '1px solid #ccc' }}>{exp.type}</td>
                    <td style={{ padding: 8, border: '1px solid #ccc' }}>{exp.description}</td>
                    <td style={{ padding: 8, border: '1px solid #ccc' }}>${exp.amount}</td>
                    <td style={{ padding: 8, border: '1px solid #ccc' }}>{exp.user.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettleExpensesPopup;
