import React from 'react';
import { AppBar, Toolbar, Typography, Button, IconButton, Menu, MenuItem, ListItemText, Divider } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import { Link, useLocation } from 'react-router-dom';
import Logout from '../Auth/Logout';

function Navbar() {
  const location = useLocation();
  const hideButtons = location.pathname === '/login';

  // Example: get user info from localStorage (adjust as needed)
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = user.name || '';
  const userEmail = user.email || 'user@example.com';

  // Dropdown state
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" style={{ flexGrow: 1 }}>
          SplitTrack
        </Typography>
        {!hideButtons && (
          <>
            <Button color="inherit" component={Link} to="/dashboard">Dashboard</Button>
            <Button color="inherit" component={Link} to="/settlement-history">Settlement History</Button>
            <Button
              color="inherit"
              onClick={handleMenuOpen}
              style={{ textTransform: 'none', fontSize: '1rem', minWidth: 0, padding: '4px 12px' }}
              endIcon={open ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
            >
              {userName}
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem disabled>
                <ListItemText primary={userName} secondary={userEmail} />
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleMenuClose}>
                <Logout />
              </MenuItem>
            </Menu>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;