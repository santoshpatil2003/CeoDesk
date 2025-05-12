import React from 'react';
import { Box, Avatar, Typography } from '@mui/joy';

/**
 * TaskUserProfile displays a user's avatar and name for a task card.
 * @param {Object} props
 * @param {Object} user - User object (may be null)
 * @param {string} [size] - Avatar size (default: 'sm')
 */
const TaskUserProfile = ({ user, size = 'lg' }) => {
  if (!user) return null;
  const initials = user.firstname && user.lastname
    ? `${user.firstname[0]}${user.lastname[0]}`.toUpperCase()
    : user.firstname
    ? user.firstname[0].toUpperCase()
    : '?';
  const title = user.UsersTitle || 'Employee';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
      <Avatar size={'lg'} sx={{ mr: 1, bgcolor: 'primary.400' }}>
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.firstname} style={{ width: '100%', height: '100%' }} />
        ) : (
          initials
        )}
      </Avatar>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography level="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
          {user.firstname} {user.lastname}
        </Typography>
        <Typography level="h5" sx={{ fontWeight: 100, color: 'text.secondary' }}>
          {title}
        </Typography>
      </Box>
    </Box>
  );
};

export default TaskUserProfile;
