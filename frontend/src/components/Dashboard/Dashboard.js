import { useEffect, useState } from 'react';
import { getUserGroups, getExpensesOwedTo, getExpensesOwedBy, getGroupDetails } from '../../services/api';

function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [individuals, setIndividuals] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [members, setMembers] = useState([]);
  const [totals, setTotals] = useState({ youOwe: 0, youAreOwed: 0, totalBalance: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const groupsResponse = await getUserGroups();
        setGroups(groupsResponse.data.group_ids);

        const owedToResponse = await getExpensesOwedTo();
        const owedByResponse = await getExpensesOwedBy();

        setTotals({
          youOwe: owedByResponse.data.individual.reduce((sum, expense) => sum + expense.amount_owed_by_me, 0),
          youAreOwed: owedToResponse.data.individual.reduce((sum, expense) => sum + expense.amount_owed, 0),
          totalBalance: owedToResponse.data.individual.reduce((sum, expense) => sum + expense.amount_owed, 0) - owedByResponse.data.individual.reduce((sum, expense) => sum + expense.amount_owed_by_me, 0),
        });

        setIndividuals([...owedToResponse.data.individual, ...owedByResponse.data.individual]);
      } catch (error) {
        console.error('Failed to fetch data', error);
      }
    };

    fetchData();
  }, []);

  const handleGroupClick = async (groupId) => {
    try {
      const groupDetails = await getGroupDetails(groupId);
      setSelectedGroup(groupDetails.data);
      setMembers(groupDetails.data.members);
      setExpenses(groupDetails.data.expenses || []); // Assuming group details include expenses
    } catch (error) {
      console.error('Failed to fetch group details', error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100vh' }}>
      {/* Sidebar */}
      <div style={{ width: '20%', borderRight: '1px solid #ccc', padding: '10px' }}>
        <h3>Groups</h3>
        <ul>
          {groups.map((groupId) => (
            <li key={groupId} onClick={() => handleGroupClick(groupId)}>
              Group ID: {groupId}
            </li>
          ))}
        </ul>
        <h3>Friends</h3>
        <ul>
          {individuals.map((individual, index) => (
            <li key={index}>{individual.name || `Friend ${index + 1}`}</li>
          ))}
        </ul>
      </div>

      {/* Main Content */}
      <div style={{ width: '60%', padding: '10px' }}>
        <h2>Dashboard</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <p>Total Balance: {totals.totalBalance}</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <div style={{ width: '45%' }}>
            <h3>You Owe</h3>
            {individuals.filter(ind => ind.amount_owed_by_me).map((individual, index) => (
              <div key={index} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
                <p>{individual.name || `Person ${index + 1}`}</p>
                <p>Owes You: ${individual.amount_owed_by_me}</p>
              </div>
            ))}
          </div>
          <div style={{ width: '45%' }}>
            <h3>You Are Owed</h3>
            {individuals.filter(ind => ind.amount_owed).map((individual, index) => (
              <div key={index} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
                <p>{individual.name || `Person ${index + 1}`}</p>
                <p>Owes You: ${individual.amount_owed}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Content */}
      <div style={{ width: '20%', borderLeft: '1px solid #ccc', padding: '10px' }}>
        {/* Removed Members Section */}
      </div>
    </div>
  );
}

export default Dashboard;