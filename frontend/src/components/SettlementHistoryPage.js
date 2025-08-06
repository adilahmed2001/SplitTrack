import React from 'react';
import SettlementHistory from './Layout/SettlementHistory';
import { Box } from '@mui/material';

function SettlementHistoryPage() {
  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 6 }}>
      <SettlementHistory />
    </Box>
  );
}

export default SettlementHistoryPage;
