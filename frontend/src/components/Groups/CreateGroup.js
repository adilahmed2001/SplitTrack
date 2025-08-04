import { useState } from 'react';
import { createGroup } from '../../services/api';

function CreateGroup() {
  const [groupName, setGroupName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createGroup({ name: groupName });
      alert('Group created successfully!');
      setGroupName('');
    } catch (error) {
      alert('Failed to create group');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create Group</h2>
      <input
        type="text"
        placeholder="Group Name"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
      />
      <button type="submit">Create Group</button>
    </form>
  );
}

export default CreateGroup;