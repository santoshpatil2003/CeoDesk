import React, { useState } from 'react';
import { 
  Box, 
  Avatar, 
  Typography, 
  Button, 
  Menu, 
  MenuItem, 
  Divider,
  IconButton,
  Badge,
  Tooltip
} from '@mui/joy';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const UserProfile = () => {
  const { currentUser, signOut, isCEO } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    open ? setAnchorEl(null) : setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth/signin');
    } catch (error) {
      console.error('Failed to sign out', error);
    }
  };

  const getUserInitials = () => {
    if (!currentUser || !currentUser.name) return '?';
    
    const nameParts = currentUser.name.split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Notifications */}
      {/* <Tooltip title="Notifications" arrow>
        <IconButton
          variant="plain"
          color="neutral"
          sx={{ 
            borderRadius: '50%',
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
          }}
        >
          <Badge badgeContent={3} color="danger">
            🔔
          </Badge>
        </IconButton>
      </Tooltip> */}
      
      {/* Settings */}
      {/* <Tooltip title="Settings" arrow>
        <IconButton
          variant="plain"
          color="neutral"
          sx={{ 
            borderRadius: '50%',
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
          }}
        >
          ⚙️
        </IconButton>
      </Tooltip> */}
      
      {/* User profile */}
      <Box
        id="user-button"
        aria-controls={open ? 'user-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, 
          cursor: 'pointer',
          p: 0.5,
          borderRadius: 'md',
          '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
        }}
      >
        <Avatar
          variant="soft"
          color={isCEO() ? 'warning' : 'primary'}
          sx={{ 
            width: 36, 
            height: 36,
            ...(isCEO() && {
              border: '2px solid',
              borderColor: 'warning.500',
            })
          }}
        >
          {getUserInitials()}
        </Avatar>
        {/* <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          <Typography level="title-sm" sx={{ fontWeight: 'md' }}>
            {currentUser?.name || 'User'}
          </Typography>
          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
            {isCEO() ? 'CEO' : (currentUser?.role || currentUser?.UsersTitle || 'Employee')}
          </Typography>
        </Box> */}
      </Box>
      
      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        aria-labelledby="user-button"
        placement="bottom-end"
        sx={{ 
          minWidth: 200,
          bgcolor: 'background.surface',
          borderRadius: 'md',
          boxShadow: 'lg',
          p: 1,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        {/* <MenuItem onClick={handleClose} sx={{ borderRadius: 'md' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'transparent' }}>
            <Avatar
              variant="soft"
              color={isCEO() ? 'warning' : 'primary'}
              sx={{ 
                width: 40, 
                height: 40,
                ...(isCEO() && {
                  border: '2px solid',
                  borderColor: 'warning.500',
                })
              }}
            >
              {getUserInitials()}
            </Avatar>
            <Box sx={{ bgcolor: 'transparent'}}>
              <Typography level="title-sm">{currentUser?.name || 'User'}</Typography>
              <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                {currentUser?.email || 'user@example.com'}
              </Typography>
            </Box>
          </Box>
        </MenuItem> */}
        
        {/* <Divider sx={{ my: 1 }} /> */}
        
        <MenuItem onClick={handleClose} sx={{ borderRadius: 'md'}}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'transparent' }}>
            👤 Profile
          </Box>
        </MenuItem>
        
        <MenuItem onClick={handleClose} sx={{ borderRadius: 'md' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'transparent' }}>
            ⚙️ Settings
          </Box>
        </MenuItem>
        
        <Divider sx={{ my: 1 }} />
        
        <MenuItem 
          onClick={() => {
            handleClose();
            handleSignOut();
          }}
          sx={{ 
            borderRadius: 'md',
            color: 'danger.500',
            '&:hover': { bgcolor: 'danger.100' }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'transparent' }}>
            🚪 Sign Out
          </Box>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default UserProfile;
