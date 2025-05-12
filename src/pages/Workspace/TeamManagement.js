import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  Option,
  Sheet,
  Avatar,
  Stack,
  Divider,
  FormHelperText,
  CircularProgress,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Chip,
  Table,
  IconButton,
  Alert
} from '@mui/joy';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAllUsersInWorkspace } from '../../firebase/getAllUsersInWorkspace';

// Available roles
const roles = [
  'Developer',
  'Designer',
  'Marketing',
  'Sales',
  'HR',
  'Finance',
  'Operations',
  'Executive',
  'Other'
];

const TeamManagement = () => {
  const navigate = useNavigate();
  const { currentUser, isCEO, currentWorkspace } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState({
    email: '',
    role: '',
    message: ''
  });

  // Users in workspace
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [errorUsers, setErrorUsers] = useState('');

  useEffect(() => {
    // Fetch all users in the current workspace
    const fetchUsers = async () => {
      if (!currentWorkspace?.id) return;
      setLoadingUsers(true);
      setErrorUsers('');
      try {
        const members = await getAllUsersInWorkspace(currentWorkspace.id);
        setUsers(members);
      } catch (err) {
        setErrorUsers('Failed to load team members.');
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [currentWorkspace]);

  // Check if user is CEO, if not redirect to workspace selection
  useEffect(() => {
    if (!isCEO()) {
      navigate('/workspace/selection');
    }
  }, [isCEO, navigate]);

  // Load invitations
  useEffect(() => {
    // If you have a real API, fetch invitations here. For now, just simulate loading.
    setTimeout(() => {
      setInvitations([]);
      setLoadingInvitations(false);
    }, 1000);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error for this field when user makes a selection
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Please enter a valid email address';
      }
    }
    
    // Role validation
    if (!formData.role) {
      errors.role = 'Role is required';
    }
    
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccessMessage('');
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    // Simulate API call to send invitation
    setLoading(true);
    setTimeout(() => {
      // Add new invitation to the list
      const newInvitation = {
        id: `inv-${Date.now()}`,
        email: formData.email,
        role: formData.role,
        status: 'pending',
        sentAt: new Date().toISOString()
      };
      
      setInvitations([newInvitation, ...invitations]);
      setLoading(false);
      setSuccessMessage(`Invitation sent to ${formData.email}`);
      
      // Reset form
      setFormData({
        email: '',
        role: '',
        message: ''
      });
    }, 1500);
  };

  const handleResendInvitation = (invitationId) => {
    // Simulate resending invitation
    setInvitations(invitations.map(inv => 
      inv.id === invitationId 
        ? { ...inv, sentAt: new Date().toISOString() } 
        : inv
    ));
    
    setSuccessMessage('Invitation resent successfully');
  };

  const handleCancelInvitation = (invitationId) => {
    // Simulate cancelling invitation
    setInvitations(invitations.filter(inv => inv.id !== invitationId));
    setSuccessMessage('Invitation cancelled');
  };

  // Generate initials for avatar
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Block UI until users and invitations finish loading
  if (loadingUsers || loadingInvitations) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'radial-gradient(circle at center, #1E1E1E 0%, #121212 100%)',
        backgroundSize: 'cover',
        position: 'relative',
        overflow: 'hidden',
        p: 0,
      }}
    >
      {/* Header */}
      <Sheet
        sx={{
          px: 2,
          py: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          bgcolor: 'transparent',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Typography level="h3" sx={{ fontWeight: 'bold' }}>
          CEODesk
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar
            variant="soft"
            color="warning"
            sx={{ 
              width: 36, 
              height: 36,
              border: '2px solid',
              borderColor: 'warning.500',
            }}
          >
            {currentUser?.name ? getInitials(currentUser.name) : '?'}
          </Avatar>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Typography level="title-sm" sx={{ fontWeight: 'md' }}>
              {currentUser?.name || 'User'}
            </Typography>
            <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
              CEO
            </Typography>
          </Box>
        </Box>
      </Sheet>

      {/* Main Content */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}>
        <Container 
          maxWidth="md" 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            height: '100%',
            maxHeight: 'calc(100vh - 120px)',
          }}
        >
          <Card
            sx={{
              backgroundColor: 'rgba(18, 18, 18, 0.8)',
              backdropFilter: 'blur(10px)',
              borderRadius: 'xl',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 4px 5px rgba(255, 255, 255, 0.1)',
              overflow: 'auto',
              flex: 1,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="plain"
                  color="neutral"
                  startDecorator="←"
                  onClick={() => navigate('/dashboard')}
                >
                  Back to Dashboard
                </Button>
              </Box>
              
              <Typography level="h2" sx={{ mb: 1 }}>
                Team Management
              </Typography>
              
              <Typography level="body-md" sx={{ mb: 3, color: 'text.secondary' }}>
                Invite team members to join your workspace
              </Typography>

              <Tabs 
                value={activeTab} 
                onChange={(_, value) => setActiveTab(value)}
                sx={{ mb: 3 }}
              >
                <TabList>
                  <Tab>Invite Members</Tab>
                  <Tab>Pending Invitations ({invitations.length})</Tab>
                </TabList>
              </Tabs>

              {successMessage && (
                <Alert 
                  color="success" 
                  sx={{ mb: 3 }}
                  onClose={() => setSuccessMessage('')}
                >
                  {successMessage}
                </Alert>
              )}

              {activeTab === 0 ? (
                // Invite Members Tab
                <form onSubmit={handleSubmit}>
                  <Stack spacing={2} sx={{ mb: 3 }}>
                    <FormControl error={!!formErrors.email}>
                      <FormLabel>Email Address *</FormLabel>
                      <Input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter email address"
                      />
                      {formErrors.email && (
                        <FormHelperText>{formErrors.email}</FormHelperText>
                      )}
                    </FormControl>

                    <FormControl error={!!formErrors.role}>
                      <FormLabel>Role *</FormLabel>
                      <Select
                        name="role"
                        value={formData.role}
                        onChange={(_, value) => handleSelectChange('role', value)}
                        placeholder="Select role"
                      >
                        {roles.map((role) => (
                          <Option key={role} value={role}>
                            {role}
                          </Option>
                        ))}
                      </Select>
                      {formErrors.role && (
                        <FormHelperText>{formErrors.role}</FormHelperText>
                      )}
                    </FormControl>

                    <FormControl>
                      <FormLabel>Invitation Message (Optional)</FormLabel>
                      <Textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Add a personal message to your invitation"
                        minRows={3}
                        maxRows={5}
                      />
                    </FormControl>
                  </Stack>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                    <Button 
                      type="submit" 
                      size="lg"
                      loading={loading}
                    >
                      {loading ? 'Sending Invitation...' : 'Send Invitation'}
                    </Button>
                  </Box>
                </form>
              ) : (
                // Pending Invitations Tab
                <Box>
                  {loadingInvitations ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress size="lg" />
                    </Box>
                  ) : invitations.length > 0 ? (
                    <Table
                      sx={{
                        '& thead th:nth-of-type(1)': { width: '40%' },
                        '& thead th:nth-of-type(2)': { width: '20%' },
                        '& thead th:nth-of-type(3)': { width: '20%' },
                        '& thead th:nth-of-type(4)': { width: '20%' },
                      }}
                    >
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Sent</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invitations.map((invitation) => (
                          <tr key={invitation.id}>
                            <td>{invitation.email}</td>
                            <td>
                              <Chip
                                variant="soft"
                                color="primary"
                                size="sm"
                              >
                                {invitation.role}
                              </Chip>
                            </td>
                            <td>
                              {new Date(invitation.sentAt).toLocaleDateString()}
                            </td>
                            <td>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <IconButton
                                  variant="plain"
                                  color="primary"
                                  size="sm"
                                  onClick={() => handleResendInvitation(invitation.id)}
                                  title="Resend"
                                >
                                  🔄
                                </IconButton>
                                <IconButton
                                  variant="plain"
                                  color="danger"
                                  size="sm"
                                  onClick={() => handleCancelInvitation(invitation.id)}
                                  title="Cancel"
                                >
                                  ❌
                                </IconButton>
                              </Box>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography level="body-lg" sx={{ mb: 2 }}>
                        No pending invitations
                      </Typography>
                      <Button
                        onClick={() => setActiveTab(0)}
                      >
                        Invite Team Members
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
          <Sheet
            sx={{
              px: 2,
              py: 1,
              display: 'flex',
              justifyContent: 'center',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              bgcolor: 'transparent',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Typography level="body3" sx={{ color: 'text.tertiary' }}>
              &copy; {new Date().getFullYear()} CEODesk. All rights reserved.
            </Typography>
          </Sheet>
        </Container>
      </Box>
    </Box>
  );
};

export default TeamManagement;
