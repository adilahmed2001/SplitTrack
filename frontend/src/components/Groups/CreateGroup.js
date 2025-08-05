import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGroup as createGroupAPI } from '../../services/api';

function CreateGroup() {
  const [groupName, setGroupName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [members, setMembers] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleAddMember = () => {
    if (memberEmail && !members.includes(memberEmail)) {
      setMembers([...members, memberEmail]);
      setMemberEmail('');
    }
  };

  const handleRemoveMember = (email) => {
    setMembers(members.filter((member) => member !== email));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createGroupAPI({ name: groupName, members });
      navigate('/dashboard'); // Redirect to dashboard after successful group creation
    } catch (error) {
      setErrorMessage('Failed to create group. Please try again.');
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
      }}>Create Group</h2>
      <input
        type="text"
        placeholder="Group Name"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        style={{
          padding: '10px',
          marginBottom: '10px',
          border: '1px solid #ccc',
          borderRadius: '5px',
          width: '100%',
          maxWidth: '300px'
        }}
      />
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '10px'
      }}>
        <input
          type="email"
          placeholder="Member Email"
          value={memberEmail}
          onChange={(e) => setMemberEmail(e.target.value)}
          style={{
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            width: '100%',
            maxWidth: '200px',
            marginRight: '10px'
          }}
        />
        <button type="button" onClick={handleAddMember} style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}>Add</button>
      </div>
      <ul style={{
        listStyleType: 'none',
        padding: '0',
        marginBottom: '10px',
        width: '100%',
        maxWidth: '300px'
      }}>
        {members.map((member, index) => (
          <li key={index} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '5px 10px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            marginBottom: '5px'
          }}>
            {member}
            <button type="button" onClick={() => handleRemoveMember(member)} style={{
              backgroundColor: '#dc3545',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              padding: '5px 10px'
            }}>Remove</button>
          </li>
        ))}
      </ul>
      <button type="submit" style={{
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer'
      }}>Create Group</button>
      {errorMessage && <p style={{ color: '#dc3545', marginTop: '10px' }}>{errorMessage}</p>}
    </form>
  );
}

export default CreateGroup;