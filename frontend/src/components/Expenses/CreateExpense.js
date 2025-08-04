import { useState } from 'react';
import { createExpense } from '../../services/api';

function CreateExpense() {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [participants, setParticipants] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createExpense({
        description,
        amount: parseFloat(amount),
        participant_ids: participants.split(',').map(Number),
        expense_type: 'individual', // or 'group'
      });
      alert('Expense created successfully!');
      setDescription('');
      setAmount('');
      setParticipants('');
    } catch (error) {
      alert('Failed to create expense');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create Expense</h2>
      <input
        type="text"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <input
        type="text"
        placeholder="Participant IDs (comma-separated)"
        value={participants}
        onChange={(e) => setParticipants(e.target.value)}
      />
      <button type="submit">Create Expense</button>
    </form>
  );
}

export default CreateExpense;