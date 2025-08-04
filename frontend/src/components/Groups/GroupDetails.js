import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getGroupDetails, addMember } from '../../services/api';

function GroupDetails() {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isOwner, setIsOwner] = useState(false); // Track if the user is the group owner

  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        const response = await getGroupDetails(groupId);
        setGroup(response.data);
        const userId = localStorage.getItem('userId'); // Assuming userId is stored in localStorage
        setIsOwner(response.data.creator.id === parseInt(userId, 10)); // Check if the user is the owner
      } catch (error) {
        alert('Failed to fetch group details');
      }
    };

    fetchGroupDetails();
  }, [groupId]);

  const handleAddMember = async () => {
    try {
      await addMember(groupId, { email: newMemberEmail });
      alert('Member added successfully!');
      setNewMemberEmail('');
    } catch (error) {
      alert('Failed to add member');
    }
  };

  if (!group) return <p>Loading...</p>;

  return (
    <div>
      <h2>Group Details</h2>
      <p>Group Name: {group.name}</p>
      <h3>Members</h3>
      <ul>
        {group.members.map((member) => (
          <li key={member.id}>{member.name} ({member.email})</li>
        ))}
      </ul>
      {isOwner && (
        <div>
          <input
            type="email"
            placeholder="New Member Email"
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
          />
          <button onClick={handleAddMember}>Add Member</button>
        </div>
      )}
    </div>
  );
}

export default GroupDetails;