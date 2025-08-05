import { useEffect, useState } from 'react';
import { getUserGroups, getExpensesOwedTo, getExpensesOwedBy, getGroupDetails, createGroup } from '../../services/api';

function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [individuals, setIndividuals] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [members, setMembers] = useState([]);
  const [totals, setTotals] = useState({ youOwe: 0, youAreOwed: 0, totalBalance: 0 });
  const [showCreateExpensePopup, setShowCreateExpensePopup] = useState(false);
  const [expenseType, setExpenseType] = useState('individual');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const [showCreateGroupPopup, setShowCreateGroupPopup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showAddMemberPopup, setShowAddMemberPopup] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addMemberMessage, setAddMemberMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const groupsResponse = await getUserGroups();
        const groupIds = groupsResponse.data.group_ids;

        const groupDetailsPromises = groupIds.map(async (groupId) => {
          const groupDetails = await getGroupDetails(groupId);
          return { id: groupId, name: groupDetails.data.name };
        });

        const groupDetails = await Promise.all(groupDetailsPromises);
        setGroups(groupDetails);

        const owedToResponse = await getExpensesOwedTo();
        const owedByResponse = await getExpensesOwedBy();

        setTotals({
          youOwe: owedByResponse.data.individual.reduce((sum, expense) => sum + expense.amount_owed_by_me, 0),
          youAreOwed: owedToResponse.data.individual.reduce((sum, expense) => sum + expense.amount_owed, 0),
          totalBalance: owedToResponse.data.individual.reduce((sum, expense) => sum + expense.amount_owed, 0) - owedByResponse.data.individual.reduce((sum, expense) => sum + expense.amount_owed_by_me, 0),
        });

        setIndividuals([
          ...owedToResponse.data.individual.map(ind => ({ ...ind, type: 'owed_to' })),
          ...owedByResponse.data.individual.map(ind => ({ ...ind, type: 'owed_by' }))
        ]);
      } catch (error) {
        if (error.response && error.response.status === 401) {
        
          window.location.href = '/login';
        } else {
          console.error('Failed to fetch data', error);
        }
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (individuals.length === 0 || individuals.every(ind => ind.name)) {
      return;
    }

    const fetchUserDetails = async () => {
      try {
        const updatedIndividuals = await Promise.all(
          individuals.map(async (individual) => {
            const userId = individual.owed_by_user || individual.paid_by;
            const response = await fetch(`/api/expenses/${userId}/details`, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
            });
            const userDetails = await response.json();
            return {
              ...individual,
              name: userDetails.name,
              email: userDetails.email,
            };
          })
        );
        setIndividuals(updatedIndividuals);
      } catch (error) {
        console.error('Failed to fetch user details', error);
      }
    };

    fetchUserDetails();
  }, [individuals]);

  const handleGroupClick = async (groupId) => {
    try {
      const groupDetails = await getGroupDetails(groupId);
      setSelectedGroup(groupDetails.data);
      setMembers(groupDetails.data.members);
      setExpenses(groupDetails.data.expenses || []); 
    } catch (error) {
      console.error('Failed to fetch group details', error);
    }
  };

  const resetDashboardContext = () => {
    setSelectedGroup(null);
    setMembers([]);
    setExpenses([]);
  };

  const handleCreateExpense = async () => {
    try {
      const payload = {
        amount,
        type: expenseType,
        ...(expenseType === 'group' ? { groupId: selectedGroupId } : { participantEmail }),
      };

      const response = await fetch('/api/expenses/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setPopupMessage('Success');
      } else {
        setPopupMessage('Failed');
      }
    } catch (error) {
      console.error('Failed to create expense', error);
      setPopupMessage('Failed');
    }
  };

  const handleCreateGroup = async () => {
    try {
      await createGroup({ name: newGroupName });
      setShowCreateGroupPopup(false);
      setNewGroupName('');
      // Refresh groups list
      const groupsResponse = await getUserGroups();
      setGroups(groupsResponse.data.group_ids);
    } catch (error) {
      alert('Failed to create group');
    }
  };

  const handleAddMember = async () => {
    setAddMemberMessage('');
    console.log('Add Member Triggered');
    console.log('Selected Group:', selectedGroup);
    console.log('New Member Email:', newMemberEmail);

    if (!selectedGroup) {
      setAddMemberMessage('No group selected. Please select a group first.');
      return;
    }

    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}/add_member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ email: newMemberEmail }),
      });

      console.log('API Response:', response);

      if (response.ok) {
        setAddMemberMessage('Success');
        
        const updatedGroupDetails = await getGroupDetails(selectedGroup.id);
        setSelectedGroup(updatedGroupDetails.data);
        setMembers(updatedGroupDetails.data.members);
      } else {
        setAddMemberMessage('Failed');
      }
    } catch (error) {
      console.error('Failed to add member', error);
      setAddMemberMessage('Failed');
    }
  };

  const groupedOwedBy = individuals.filter(ind => ind.amount_owed_by_me).reduce((acc, individual) => {
    const key = individual.paid_by_name || individual.paid_by_email;
    if (!acc[key]) {
      acc[key] = {
        name: individual.paid_by_name || individual.paid_by_email,
        email: individual.paid_by_email,
        totalAmount: 0,
      };
    }
    acc[key].totalAmount += individual.amount_owed_by_me;
    return acc;
  }, {});

  const groupedOwedTo = individuals.filter(ind => ind.amount_owed).reduce((acc, individual) => {
    const key = individual.owed_by_name || individual.owed_by_email;
    if (!acc[key]) {
      acc[key] = {
        name: individual.owed_by_name || individual.owed_by_email,
        email: individual.owed_by_email,
        totalAmount: 0,
      };
    }
    acc[key].totalAmount += individual.amount_owed;
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100vh' }}>
      {/* Left Sidebar */}
      <div style={{ width: '20%', borderRight: '1px solid #ccc', padding: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3>Groups</h3>
          <button
            onClick={() => setShowCreateGroupPopup(true)}
            style={{
              backgroundColor: 'transparent',
              color: '#007bff',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            +add
          </button>
        </div>
        <ul style={{ listStyleType: 'none' }}>
          {groups.map((group) => (
            <li
              key={group.id}
              onClick={() => handleGroupClick(group.id)}
              style={{
                cursor: 'pointer',
                padding: '10px',
                margin: '5px 0',
                border: '1px solid #007bff',
                borderRadius: '5px',
                backgroundColor: selectedGroup && selectedGroup.id === group.id ? '#007bff' : '#e9f5ff',
                color: selectedGroup && selectedGroup.id === group.id ? '#fff' : '#007bff',
                textAlign: 'center',
                transition: 'background-color 0.3s, color 0.3s',
              }}
              onMouseEnter={(e) => {
                if (!(selectedGroup && selectedGroup.id === group.id)) {
                  e.target.style.backgroundColor = '#007bff';
                  e.target.style.color = '#fff';
                }
              }}
              onMouseLeave={(e) => {
                if (!(selectedGroup && selectedGroup.id === group.id)) {
                  e.target.style.backgroundColor = '#e9f5ff';
                  e.target.style.color = '#007bff';
                }
              }}
            >
              {group.name}
            </li>
          ))}
        </ul>

        {/* Create Group Popup */}
        {showCreateGroupPopup && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#fff',
            padding: '20px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            borderRadius: '8px'
          }}>
            <h4>Create Group</h4>
            <input
              type="text"
              placeholder="Group Name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              style={{
                padding: '10px',
                marginBottom: '10px',
                border: '1px solid #ccc',
                borderRadius: '5px',
                width: '100%'
              }}
            />
            <button
              onClick={handleCreateGroup}
              style={{
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Create
            </button>
            <button
              onClick={() => setShowCreateGroupPopup(false)}
              style={{
                marginLeft: '10px',
                padding: '10px 20px',
                backgroundColor: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ width: '60%', padding: '10px' }}>
        {selectedGroup ? (
          <>
            <button onClick={resetDashboardContext} style={{ marginBottom: '10px', padding: '5px 10px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '5px' }}>Back</button>
            <h3>Group Transactions</h3>
            {expenses.map((expense, index) => (
              <div key={index} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '10px', marginBottom: '10px', backgroundColor: '#f9f9f9' }}>
                <p><strong>{expense.description}</strong></p>
                <p>Added by: {expense.added_by}</p>
                <p>Owes: {expense.owes}</p>
              </div>
            ))}
          </>
        ) : (
          <>
            {/* Dashboard Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#20c997', color: '#fff', borderBottom: '2px solid #ccc' }}>
              <h1 style={{ margin: '0', fontSize: '1.5rem' }}>Dashboard</h1>
              <button onClick={() => setShowCreateExpensePopup(true)} style={{ padding: '5px 10px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '5px' }}>Create Expense</button>
            </div>

            {/* Create Expense Popup */}
            {showCreateExpensePopup && (
              <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: '#fff',
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                zIndex: 1000,
              }}>
                <h3 style={{ margin: '0 0 10px 0' }}>Add an expense</h3>
                <div style={{ marginBottom: '10px' }}>
                  <label>Amount: </label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ padding: '5px', border: '1px solid #ccc', borderRadius: '5px' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label>Type: </label>
                  <select value={expenseType} onChange={(e) => setExpenseType(e.target.value)} style={{ padding: '5px', border: '1px solid #ccc', borderRadius: '5px' }}>
                    <option value="individual">Individual</option>
                    <option value="group">Group</option>
                  </select>
                </div>
                {expenseType === 'group' ? (
                  <div style={{ marginBottom: '10px' }}>
                    <label>Group: </label>
                    <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} style={{ padding: '5px', border: '1px solid #ccc', borderRadius: '5px' }}>
                      {groups.map((groupId) => (
                        <option key={groupId} value={groupId}>{groupId}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div style={{ marginBottom: '10px' }}>
                    <label>Participant Email: </label>
                    <input type="email" value={participantEmail} onChange={(e) => setParticipantEmail(e.target.value)} style={{ padding: '5px', border: '1px solid #ccc', borderRadius: '5px' }} />
                  </div>
                )}
                <button onClick={handleCreateExpense} style={{ padding: '5px 10px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', marginRight: '10px' }}>Save</button>
                <button onClick={() => setShowCreateExpensePopup(false)} style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '5px' }}>Cancel</button>
                {popupMessage && <p style={{ marginTop: '10px', color: popupMessage === 'Success' ? '#28a745' : '#dc3545' }}>{popupMessage}</p>}
              </div>
            )}

            {/* Top Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #ccc', borderBottom: '2px solid #ccc', padding: '10px', marginBottom: '20px', backgroundColor: '#f9f9f9' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: '0', fontWeight: 'bold' }}>total balance</p>
                <p style={{ margin: '0', color: totals.totalBalance >= 0 ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>{totals.totalBalance >= 0 ? `+ $${totals.totalBalance}` : `- $${Math.abs(totals.totalBalance)}`}</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: '0', fontWeight: 'bold' }}>you owe</p>
                <p style={{ margin: '0', color: '#6c757d' }}>${totals.youOwe}</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: '0', fontWeight: 'bold' }}>you are owed</p>
                <p style={{ margin: '0', color: '#28a745', fontWeight: 'bold' }}>${totals.youAreOwed}</p>
              </div>
            </div>

            {/* Columns Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {/* You Owe Column */}
              <div style={{ width: '45%' }}>
                <h3>You Owe</h3>
                {Object.values(groupedOwedBy).map((individual, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', border: '1px solid #ccc', borderRadius: '8px', padding: '10px', marginBottom: '10px', backgroundColor: '#f9f9f9' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#ff6b6b', marginRight: '10px' }}></div>
                    <div>
                      <p style={{ margin: '0', fontWeight: 'bold' }}>{individual.name}</p>
                      <p style={{ margin: '0', color: '#6c757d' }}>owes you <span style={{ color: '#28a745', fontWeight: 'bold' }}>${individual.totalAmount}</span></p>
                    </div>
                  </div>
                ))}
              </div>

              {/* You Are Owed Column */}
              <div style={{ width: '45%' }}>
                <h3>You Are Owed</h3>
                {Object.values(groupedOwedTo).map((individual, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', border: '1px solid #ccc', borderRadius: '8px', padding: '10px', marginBottom: '10px', backgroundColor: '#f9f9f9' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#ff6b6b', marginRight: '10px' }}></div>
                    <div>
                      <p style={{ margin: '0', fontWeight: 'bold' }}>{individual.name}</p>
                      <p style={{ margin: '0', color: '#6c757d' }}>owes you <span style={{ color: '#28a745', fontWeight: 'bold' }}>${individual.totalAmount}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right Sidebar */}
      <div style={{ width: '20%', borderLeft: '1px solid #ccc', padding: '10px' }}>
        {selectedGroup ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3>Group Members</h3>
              <button
                onClick={() => setShowAddMemberPopup(true)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#007bff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                +add member
              </button>
            </div>
            {members.map((member, index) => (
              <div key={index} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '10px', marginBottom: '10px', backgroundColor: '#f9f9f9' }}>
                <p><strong>{member.name}</strong></p>
                <p>Email: {member.email}</p>
              </div>
            ))}

            {/* Add Member Popup */}
            {showAddMemberPopup && (
              <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: '#fff',
                padding: '20px',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                borderRadius: '8px'
              }}>
                <h4>Add Member</h4>
                <input
                  type="email"
                  placeholder="Member Email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  style={{
                    padding: '10px',
                    marginBottom: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '5px',
                    width: '100%'
                  }}
                />
                <button
                  onClick={handleAddMember}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddMemberPopup(false)}
                  style={{
                    marginLeft: '10px',
                    padding: '10px 20px',
                    backgroundColor: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                {addMemberMessage && <p style={{ color: addMemberMessage === 'Success' ? '#28a745' : '#dc3545', marginTop: '10px' }}>{addMemberMessage}</p>}
              </div>
            )}
          </>
        ) : (
          <p>Select a group to view members</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;