import { useEffect, useState } from 'react';
import SettleExpensesPopup from './SettleExpensesPopup';
import { getUserGroups, getGroupDetails, getBalance, getExpensesOwedTo, getExpensesOwedBy, getGroupTransactions, createGroup } from '../../services/api';


const backendBaseUrl = 'http://localhost:5000/api';

function Dashboard() {
  // Reusable dashboard data refresh function
  const refreshDashboardData = async () => {
    // Fetch balance and owed data again
    const balanceResponse = await getBalance();
    setTotals({
      youOwe: balanceResponse.data.total_owe,
      youAreOwed: balanceResponse.data.total_owed,
      totalBalance: balanceResponse.data.total_balance,
    });

    const [owedToResponse, owedByResponse] = await Promise.all([
      getExpensesOwedTo(),
      getExpensesOwedBy(),
    ]);
    const owedTo = owedToResponse.data.unsettled_shares.map((share) => ({
      ...share,
      type: 'owed_to',
    }));
    const owedBy = owedByResponse.data.unsettled_shares.map((share) => ({
      ...share,
      type: 'owed_by',
    }));
    setIndividuals([...owedTo, ...owedBy]);
  };
  const [groups, setGroups] = useState([]);
  const [individuals, setIndividuals] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [members, setMembers] = useState([]);
  const [totals, setTotals] = useState({ youOwe: 0, youAreOwed: 0, totalBalance: 0 });
  const [showCreateExpensePopup, setShowCreateExpensePopup] = useState(false);
  const [expenseType, setExpenseType] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [amount, setAmount] = useState(0);
  const [splitType, setSplitType] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupedOwedTo, setGroupedOwedTo] = useState([]);
  const [groupedOwedBy, setGroupedOwedBy] = useState([]);
  const [showCreateGroupPopup, setShowCreateGroupPopup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showAddMemberPopup, setShowAddMemberPopup] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addMemberMessage, setAddMemberMessage] = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const [description, setDescription] = useState('');
  const [showSettlePopup, setShowSettlePopup] = useState(false);

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

        const balanceResponse = await getBalance();
        setTotals({
          youOwe: balanceResponse.data.total_owe,
          youAreOwed: balanceResponse.data.total_owed,
          totalBalance: balanceResponse.data.total_balance,
        });
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
    const fetchOwedData = async () => {
      try {
        const [owedToResponse, owedByResponse] = await Promise.all([
          getExpensesOwedTo(),
          getExpensesOwedBy(),
        ]);

        const owedTo = owedToResponse.data.unsettled_shares.map((share) => ({
          ...share,
          type: 'owed_to',
        }));

        const owedBy = owedByResponse.data.unsettled_shares.map((share) => ({
          ...share,
          type: 'owed_by',
        }));

        setIndividuals([...owedTo, ...owedBy]);
      } catch (error) {
        console.error('Failed to fetch owed data', error);
      }
    };

    fetchOwedData();
  }, []);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const updatedIndividuals = await Promise.all(
          individuals.map(async (individual) => {
            if (!individual.name && (individual.type === 'owed_to' || individual.type === 'owed_by')) {
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
            } else if (!individual.group_name && individual.group_id) {
              const response = await fetch(`/api/expenses/${individual.group_id}/details`, {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
              });
              const groupDetails = await response.json();
              return {
                ...individual,
                group_name: groupDetails.group_name,
                participants: groupDetails.group_expenses,
              };
            }
            return individual;
          })
        );
        setIndividuals((prev) => {
          const hasChanges = JSON.stringify(prev) !== JSON.stringify(updatedIndividuals);
          return hasChanges ? updatedIndividuals : prev;
        });
      } catch (error) {
        console.error('Failed to fetch details', error);
      }
    };

    if (individuals.some(ind => !ind.name || !ind.group_name)) {
      fetchDetails();
    }
  }, [individuals]);

  useEffect(() => {
    const groupAndCalculateNetBalances = () => {
      const groupedData = individuals.reduce((acc, individual) => {
        const key = individual.owed_by_email || individual.paid_by_email;

        if (!acc[key]) {
          acc[key] = {
            name: individual.owed_by_name || individual.paid_by_name,
            email: key,
            netAmount: 0,
            totalAmount: 0,
          };
        }

        if (individual.type === 'owed_to') {
          acc[key].netAmount += individual.amount_owed;
        } else if (individual.type === 'owed_by') {
          acc[key].netAmount -= individual.amount_owed_by_me;
        }

        return acc;
      }, {});

      // Set totalAmount as absolute value for display
      Object.values(groupedData).forEach(ind => {
        ind.totalAmount = Math.abs(ind.netAmount);
      });

      const groupedOwedTo = Object.values(groupedData).filter(ind => ind.netAmount > 0);
      const groupedOwedBy = Object.values(groupedData).filter(ind => ind.netAmount < 0);

      setGroupedOwedTo(groupedOwedTo);
      setGroupedOwedBy(groupedOwedBy);
    };

    groupAndCalculateNetBalances();
  }, [individuals]);

  const handleGroupClick = async (groupId) => {
    try {
      // Clear previous group transactions before loading new ones
      setExpenses([]);
      setMembers([]);

      const groupTransactions = await getGroupTransactions(groupId);
      const groupDetails = await getGroupDetails(groupId);

      // Ensure selectedGroup has id property for highlighting
      setSelectedGroup({ ...groupTransactions.data, id: groupId });
      setSelectedGroupId(groupId);
      setMembers(groupDetails.data.members);

      // Pass total_owed and total_owes to each expense card
      setExpenses(groupTransactions.data.group_expenses.map(expense => ({
        description: expense.description,
        paid_by: expense.paid_by,
        amount: expense.amount,
        participants: expense.participants,
        total_owed: groupTransactions.data.total_owed,
        total_owes: groupTransactions.data.total_owes,
      })));
    } catch (error) {
      console.error('Failed to fetch group transactions or members', error);
    }
  };

  const resetDashboardContext = () => {
    setSelectedGroup(null);
    setMembers([]);
    setExpenses([]);
  };

  const handleCreateExpense = async () => {
    try {
      const endpoint = expenseType === 'group'
        ? `${backendBaseUrl}/expenses/create/group`
        : `${backendBaseUrl}/expenses/create/individual`;

      const payload = {
        description,
        amount,
        split_type: splitType,
        ...(expenseType === 'individual' && { participant_email: participantEmail }),
        ...(expenseType === 'group' && { group_id: selectedGroupId }),
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setPopupMessage('Expense created successfully');
        setDescription('');
        setAmount(0);
        setSplitType('');
        setExpenseType('');
        setParticipantEmail('');
        setSelectedGroupId('');

        await refreshDashboardData();
      } else {
        setPopupMessage('Failed to create expense');
      }
    } catch (error) {
      console.error('Error creating expense', error);
      setPopupMessage('An error occurred while creating the expense');
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

  // ...existing code...

  const renderGroupTransactions = () => {
    return expenses.map((expense, index) => (
      <div
        key={index}
        className="transaction-card"
        style={{
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '15px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          backgroundColor: '#fff',
          width: '100%',
          maxWidth: '600px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ flex: 1 }}>
          <h3 style={{ marginBottom: '10px', fontSize: '1.2rem', color: '#333' }}>{expense.description}</h3>
          <p style={{ marginBottom: '5px', color: '#555' }}><strong>Added by:</strong> {expense.paid_by.name}</p>
          <p style={{ marginBottom: '5px', color: '#555' }}><strong>Participants:</strong> {expense.participants.map(participant => participant.name).join(', ')}</p>
        </div>
        <div style={{ flex: 0.5, textAlign: 'right', color: '#555' }}>
          <p style={{ marginBottom: '5px', fontSize: '1.2rem' }}><strong>Amount:</strong> ${expense.amount}</p>
          {/* Show total_owed and total_owes below amount, only if not zero. If both are zero, show settled message. */}
          {expense.total_owed === 0 && expense.total_owes === 0 ? (
            <p style={{ marginBottom: '5px', color: '#6c757d', fontWeight: 'bold' }}>Expense already settled</p>
          ) : (
            <>
              {expense.total_owed !== 0 && (
                <p style={{ marginBottom: '5px', color: '#28a745', fontWeight: 'bold' }}>
                  Total Owed to Me: ${expense.total_owed}
                </p>
              )}
              {expense.total_owes !== 0 && (
                <p style={{ marginBottom: '5px', color: '#dc3545', fontWeight: 'bold' }}>
                  Total I Owe: ${expense.total_owes}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    ));
  };

  const renderCreateExpensePopup = () => (
    <div style={{ position: 'relative', padding: '24px', border: '1px solid #007bff', borderRadius: '12px', backgroundColor: '#f8faff', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', minWidth: 350 }}>
      {/* Close X button */}
      <button
        onClick={() => setShowCreateExpensePopup(false)}
        style={{
          position: 'absolute',
          top: '12px',
          right: '16px',
          background: 'transparent',
          border: 'none',
          fontSize: '1.5rem',
          color: '#007bff',
          cursor: 'pointer',
          fontWeight: 'bold',
          zIndex: 10,
        }}
        aria-label="Close"
      >
        &times;
      </button>
      <h3 style={{ marginBottom: '18px', color: '#007bff' }}>Create Expense</h3>
      <p style={{ fontWeight: 'bold', marginBottom: '12px' }}>Payer: <span style={{ color: '#20c997' }}>{localStorage.getItem('email')}</span></p>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontWeight: 'bold', marginRight: '8px' }}>Type of Expense:</label>
        <select value={expenseType} onChange={(e) => setExpenseType(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', minWidth: 120 }}>
          <option value="">Select</option>
          <option value="individual">Individual</option>
          <option value="group">Group</option>
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontWeight: 'bold', marginRight: '8px' }}>Description:</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter description"
          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', width: '70%' }}
        />
      </div>

      {expenseType === 'individual' && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontWeight: 'bold', marginRight: '8px' }}>Participant Email:</label>
          <input
            type="email"
            value={participantEmail}
            onChange={(e) => setParticipantEmail(e.target.value)}
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', width: '70%' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '16px' }}>
            <span style={{ fontWeight: 'bold', marginRight: '8px' }}>You paid</span>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', width: 80, marginRight: '12px' }} />
            <span style={{ fontWeight: 'bold', marginRight: '8px' }}>and</span>
            <select value={splitType} onChange={(e) => setSplitType(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', minWidth: 180 }}>
              <option value="">Select split type</option>
              <option value="equal">split equally with {participantEmail || 'participant'}</option>
              <option value="you_are_owed">{participantEmail || 'participant'} owes you full</option>
            </select>
          </div>
        </div>
      )}

      {expenseType === 'group' && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontWeight: 'bold', marginRight: '8px' }}>Group:</label>
          <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', minWidth: 180 }}>
            <option value="">Select</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>{group.name} ({group.id})</option>
            ))}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '16px' }}>
            <span style={{ fontWeight: 'bold', marginRight: '8px' }}>You paid</span>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', width: 80, marginRight: '12px' }} />
            <span style={{ fontWeight: 'bold', marginRight: '8px' }}>and</span>
            <select value={splitType} onChange={(e) => setSplitType(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', minWidth: 180 }}>
              <option value="">Select split type</option>
              <option value="equal">split equally with all</option>
              <option value="you_are_owed">others owe you full</option>
            </select>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
        <button onClick={handleCreateExpense} style={{ padding: '10px 24px', backgroundColor: '#20c997', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', marginRight: '12px', boxShadow: '0 2px 8px rgba(32,201,151,0.08)' }}>Submit</button>
        <button onClick={() => setShowCreateExpensePopup(false)} style={{ padding: '10px 24px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', boxShadow: '0 2px 8px rgba(220,53,69,0.08)' }}>Cancel</button>
      </div>
      {popupMessage && <p style={{ marginTop: '16px', color: popupMessage.includes('success') ? '#20c997' : '#dc3545', fontWeight: 'bold' }}>{popupMessage}</p>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100vh', position: 'relative' }}>
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
            <div className="group-transactions">
              {renderGroupTransactions()}
            </div>
          </>
        ) : (
          <>
            {/* Dashboard Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#20c997', color: '#fff', borderBottom: '2px solid #ccc' }}>
              <h1 style={{ margin: '0', fontSize: '1.5rem' }}>Dashboard</h1>
              <button onClick={() => setShowCreateExpensePopup(true)} style={{ padding: '5px 10px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '5px' }}>Create Expense</button>
            </div>

            {/* Create Expense Popup */}
            {showCreateExpensePopup && renderCreateExpensePopup()}

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
                      <p style={{ margin: '0', color: '#dc3545', fontWeight: 'bold' }}>you owe <span style={{ color: '#dc3545', fontWeight: 'bold' }}>${individual.totalAmount}</span></p>
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

            {/* Settle Expense Button and Popup removed as requested */}
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
      {/* Settle Expenses Button (fixed at bottom center) */}
      <button
        style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 1200, background: '#4caf50', color: '#fff', border: 'none', borderRadius: 6, padding: '12px 32px', fontWeight: 'bold', fontSize: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        onClick={() => setShowSettlePopup(true)}
      >
        Settle Expenses
      </button>
      <SettleExpensesPopup open={showSettlePopup} onClose={() => setShowSettlePopup(false)} onSettleSuccess={refreshDashboardData} />
    </div>
  );
}

export default Dashboard;