import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import Logout from '../Auth/Logout';

function Navbar() {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" style={{ flexGrow: 1 }}>
          SplitTrack
        </Typography>
        <Button color="inherit" component={Link} to="/dashboard">Dashboard</Button>
        <Button color="inherit" component={Link} to="/groups/create">Create Group</Button>
        <Button color="inherit" component={Link} to="/expenses/create">Create Expense</Button>
        <Button color="inherit" component={Link} to="/expenses/settle">Settle Expense</Button>
        <Logout />
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;