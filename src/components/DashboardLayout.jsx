import React from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Stack,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Logout as LogoutIcon,
  Person as PersonIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

const DashboardLayout = ({ children }) => {
  const { userProfile, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to logout');
    }
  };

  const copyPhoneNumber = () => {
    if (userProfile?.phone) {
      navigator.clipboard.writeText(userProfile.phone);
      toast.success('Phone number copied to clipboard!');
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {(userProfile?.role === 'dealer' || userProfile?.userType === 'dealer') ? 'Dealer Dashboard' : 'Retailer Dashboard'}
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            {(userProfile?.role === 'dealer' || userProfile?.userType === 'dealer') && userProfile?.phone && (
              <Box sx={{ mt: 2 }}>
                <Chip
                  color="primary"
                  variant="outlined"
                  label={`Phone: ${userProfile.phone}`}
                  onClick={copyPhoneNumber}
                  onDelete={copyPhoneNumber}
                  deleteIcon={<CopyIcon />}
                />
              </Box>
            )}
            <IconButton
              color="inherit"
              onClick={handleLogout}
            >
              <LogoutIcon />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: '100%',
          minHeight: '100vh',
          mt: '64px', // Height of AppBar
          bgcolor: 'background.default'
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default DashboardLayout;
