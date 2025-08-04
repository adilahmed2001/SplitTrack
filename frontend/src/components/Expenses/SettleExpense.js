import { useState } from 'react';
import { settleExpense } from '../../services/api';

function SettleExpense() {
  const [expenseId, setExpenseId] = useState('');
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await settleExpense({
        expense_id: parseInt(expenseId),
        user_id: parseInt(userId),
        amount: parseFloat(amount),
      });
      alert('Expense settled successfully!');
      setExpenseId('');
      setUserId('');
      setAmount('');
    } catch (error) {
      alert('Failed to settle expense');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Settle Expense</h2>
      <input
        type="number"
        placeholder="Expense ID"
        value={expenseId}
        onChange={(e) => setExpenseId(e.target.value)}
      />
      <input
        type="number"
        placeholder="User ID"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
      />
      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button type="submit">Settle Expense</button>
    </form>
  );
}

export default SettleExpense;