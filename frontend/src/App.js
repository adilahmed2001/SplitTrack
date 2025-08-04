import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import Dashboard from './components/Dashboard/Dashboard';
import CreateGroup from './components/Groups/CreateGroup';
import GroupDetails from './components/Groups/GroupDetails';
import CreateExpense from './components/Expenses/CreateExpense';
import SettleExpense from './components/Expenses/SettleExpense';
import Navbar from './components/Layout/Navbar';
import ProtectedRoute from './components/Auth/ProtectedRoute';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/groups/create" element={<ProtectedRoute><CreateGroup /></ProtectedRoute>} />
        <Route path="/groups/:groupId" element={<ProtectedRoute><GroupDetails /></ProtectedRoute>} />
        <Route path="/expenses/create" element={<ProtectedRoute><CreateExpense /></ProtectedRoute>} />
        <Route path="/expenses/settle" element={<ProtectedRoute><SettleExpense /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;