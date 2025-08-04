import { useState } from 'react';
import { addMember } from '../../services/api';

function AddMember({ groupId, onMemberAdded }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addMember(groupId, { email });
      setEmail('');
      setError(null);
      if (onMemberAdded) onMemberAdded(); // Notify parent component
    } catch (err) {
      setError('Failed to add member. Please try again.');
    }
  };

  return (
    <div>
      <h3>Add Member</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Enter member's email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default AddMember;
