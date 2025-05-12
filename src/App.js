import React, { useState, useEffect } from 'react';
import {
  CssVarsProvider,
  Box,
  Typography,
  Sheet,
  List,
  ListItem,
  ListItemButton,
  Container,
  IconButton,
  Divider,
  Modal,
  ModalDialog,
  ModalClose,
  Input,
  Textarea,
  Button,
  FormControl,
  FormLabel,
  Stack,
  CircularProgress,
} from '@mui/joy';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import DeleteIcon from '@mui/icons-material/Delete';

import Department from './pages/Department';
import GodsEye from './pages/GodsEye';
import FileShare from './components/FileShare';
import DepartmentSidebar from './components/DepartmentSidebar';
import UserProfile from './components/UserProfile';
import TeamManagement from './pages/TeamManagement';
import DailyTasks from './components/DailyTasks';
import GlobalDailyTasks from './components/GlobalDailyTasks';
import theme from './theme';
import { useAuth } from './contexts/AuthContext';
import AuthPersistenceHandler from './AuthPersistenceHandler';

// Auth pages
import { Welcome, SignIn, SignUp, ForgotPassword } from './pages/Auth';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Unauthorized from './pages/Unauthorized';

// Workspace pages
import { WorkspaceSelection, WorkspaceCreation } from './pages/Workspace';

// Add Teammate Modal Component
const AddTeammateModal = ({ open, onClose }) => {
  const { currentWorkspace } = useAuth();
  const workspaceName = currentWorkspace?.companyName || '';
  const workspaceId = currentWorkspace?.id || '';
  const defaultSubject = `You’re invited to join ${workspaceName} on CEODesk!`;
  const defaultBody = `Hey {name}, We would love for you to join our workspace as {Position} in CEODesk to collaborate with your teammates effortlessly.`;
  const [email, setEmail] = useState('');
  const [position, setPosition] = useState('');
  const [emailSubject, setEmailSubject] = useState(defaultSubject);
  const [emailBody, setEmailBody] = useState(defaultBody);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Update default subject when workspaceName becomes available
  useEffect(() => {
    if (workspaceName) setEmailSubject(`You’re invited to join ${workspaceName} on CEODesk!`);
  }, [workspaceName]);

  const generateInviteLink = (email, workspaceId, position) => {
    // Replace with secure, unique token generation in production
    const token = btoa(`${email}:${workspaceId}:${position}:${Date.now()}`);
    return `http://localhost:3000/auth/signup?token=${token}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const inviteLink = generateInviteLink(email, workspaceId, position);
      const response = await fetch('http://localhost:5000/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: email,
          teamName: workspaceName,
          inviteLink,
          position,
          subject: emailSubject,
          body: emailBody,
        }),
      });
      if (response.ok) {
        setFeedback({ type: 'success', message: 'Invitation sent!' });
        setEmail('');
        setPosition('');
        setEmailSubject('');
        setEmailBody('');
        setTimeout(() => {
          setFeedback(null);
          onClose();
        }, 1500);
      } else {
        const data = await response.json();
        setFeedback({ type: 'error', message: data.error || 'Failed to send invite.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  
  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog>
        <ModalClose />
        <Typography level="h4">Add New Teammate</Typography>
        <Typography level="body-sm" sx={{ mb: 3, color: 'text.secondary' }}>
          Invite a new team member to join your company workspace.
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {feedback && (
              <Typography level="body-sm" sx={{ color: feedback.type === 'success' ? 'success.main' : 'danger.main' }}>
                {feedback.message}
              </Typography>
            )}
            <FormControl>
              <FormLabel>Email Address</FormLabel>
              <Input 
                placeholder="colleague@example.com"
                sx={{ color: 'text.primary' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Position/Title</FormLabel>
              <Input 
                placeholder="e.g. Marketing Manager"
                sx={{ color: 'text.primary' }}
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                required
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Email Subject</FormLabel>
              <Input
                placeholder="Invitation to join..."
                sx={{ color: 'text.primary' }}
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                required
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Email Body</FormLabel>
              <Textarea
                placeholder="Hello, I'd like to invite you..."
                sx={{ color: 'text.primary' }}
                minRows={4}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                required
              />
            </FormControl>
            
            <Button type="submit" sx={{ mt: 1 }} disabled={loading}>
              {loading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </Stack>
        </form>
      </ModalDialog>
    </Modal>
  );
};

// Dashboard component that contains the main application UI
const Dashboard = () => {
  const { currentUser, isCEO, currentWorkspace } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [myDeskTab, setMyDeskTab] = useState(0); // 0 for GodsEye, 1 for Files
  const [time, setTime] = useState(new Date());
  const [showTeammateModal, setShowTeammateModal] = useState(false);
  const [deletingDepartment, setDeletingDepartment] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Subscribe to workspace changes and update departments in real time
  useEffect(() => {
    if (!currentWorkspace?.id) return;
    let unsubscribe;
    const subscribe = async () => {
      const { subscribeToWorkspace } = await import('./firebase/config');
      unsubscribe = subscribeToWorkspace(currentWorkspace.id, (workspaceData) => {
        if (workspaceData && workspaceData.Departments) {
          // Firestore returns an array, not an object, so use as-is
          setDepartments(workspaceData.Departments);
          console.log('Departments snapshot:', workspaceData.Departments);
        } else {
          setDepartments([]);
        }
        setLoadingDepartments(false);
      });
    };
    subscribe();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentWorkspace]);

  // Department creation is handled in Firestore, so no need to update state here
  const handleCreateDepartment = () => {};
  
  const handleGoHome = () => {
    setSelectedDepartment(null);
  };

  const handleDeleteDepartment = async () => {
    if (!currentUser || !selectedDepartment) return;
    const isCreator = selectedDepartment.createdByUid === currentUser.uid;
    if (!isCreator && !isCEO()) {
      alert('Only the creator or CEO can delete this department');
      return;
    }
    setDeletingDepartment(true);
    try {
      const { deleteDepartment } = await import('./firebase/config');
      await deleteDepartment(currentWorkspace.id, selectedDepartment.id);
      setDepartments(departments.filter(d => d.id !== selectedDepartment.id));
      setSelectedDepartment(null);
    } catch (err) {
      console.error('Department deletion error:', err);
      alert('Failed to delete department: ' + (err && err.message ? err.message : err));
    } finally {
      setDeletingDepartment(false);
    }
  };

  const confirmDelete = () => {
    setConfirmOpen(false);
    handleDeleteDepartment();
  };

  // console.log(selectedDepartment?.id);

  if (!currentWorkspace || !currentWorkspace.id) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size="lg" />
      </Box>
    );
  }
  if (loadingDepartments) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size="lg" />
      </Box>
    );
  }
  return (
    <Box sx={{
      display: 'flex',
      flexDirection: { xs: 'column', md: 'row' },
      minHeight: '100vh',
      bgcolor: 'background.surface',
      color: 'text.primary',
      margin: 0,
      padding: 0,
      overflow: 'hidden'
    }}>
        {/* Department Sidebar */}
        <DepartmentSidebar 
          departments={departments} 
          selectedDepartment={selectedDepartment} 
          onSelectDepartment={setSelectedDepartment} 
          onCreateDepartment={handleCreateDepartment}
          onGoHome={handleGoHome}
        />
        
        {/* Content Area with Time and Feature Navigation */}
        <Sheet
          sx={{
            width: { xs: '100%', md: 250 },
            p: { xs: 2, md: 2 },
            borderRight: { xs: 'none', md: '1px solid rgba(255, 255, 255, 0.2)' },
            borderBottom: { xs: '1px solid rgba(255, 255, 255, 0.2)', md: 'none' },
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.surface',
            boxShadow: 'none',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography level="h3" component="h1" sx={{ fontWeight: 'xl' }}>
              {currentWorkspace?.companyName || 'Workspace'}
            </Typography>
            {/* <UserProfile /> */}
            {/* {!selectedDepartment ? <UserProfile /> : null} */}
          </Box>

          <Box sx={{ mb: 1 }}>
            <Typography level="body3" sx={{ mb: 0.5 }}>
              {time.toLocaleTimeString()}
            </Typography>
            <Typography level="body2" sx={{ color: 'text.secondary' }}>
              {time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />
          
          {!selectedDepartment || selectedDepartment.id === 'ceodesk' ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography level="h4" component="h2">
                  {selectedDepartment && selectedDepartment.id === 'ceodesk' ? 'CEODesk' : 'MyDesk'}
                </Typography>
              </Box>
              {isCEO() && (
                <Box sx={{ width: '100%', height: '1.7%',display: 'flex', justifyContent: 'center', marginBottom: 2 }}>
                  <Button sx={{ width: '100%', height: '80%' }} onClick={() => setShowTeammateModal(true)}>👥 Add Teammate</Button>
                </Box>
              )}
              
              <List
                sx={{
                  '--ListItem-radius': '8px',
                  '--List-gap': '8px',
                  overflow: 'auto',
                  flexGrow: 1,
                }}
              >
                <Typography level="body2" sx={{ color: 'text.tertiary', mb: 1, pl: 1, marginTop: 2 }}>
                  FEATURES
                </Typography>
                {isCEO() && (
                  <ListItem>
                    <ListItemButton
                      selected={myDeskTab === 0}
                      onClick={() => setMyDeskTab(0)}
                    >
                      👁️ GodsEye
                    </ListItemButton>
                  </ListItem>
                )}
                {isCEO() && (
                  <ListItem>
                    <ListItemButton
                      selected={myDeskTab === 2}
                      onClick={() => setMyDeskTab(2)}
                    >
                      👥 Team Management
                    </ListItemButton>
                  </ListItem>
                )}
                <ListItem>
                  <ListItemButton
                    selected={isCEO() ? myDeskTab === 1 : myDeskTab === 0}
                    onClick={() => setMyDeskTab(isCEO() ? 1 : 0)}
                  >
                    ✓ Daily Tasks
                  </ListItemButton>
                </ListItem>
                {/* {isCEO() && (
                  <ListItem>
                    <ListItemButton
                      onClick={() => setShowTeammateModal(true)}
                    >
                      👥 Add Teammate
                    </ListItemButton>
                  </ListItem>
                )} */}
              </List>
            </>
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, justifyContent: 'space-between' }}>
                <Typography level="h4" component="h2">
                  {selectedDepartment.name}
                </Typography>
                {(selectedDepartment.createdByUid === currentUser.uid || isCEO()) && (
                  <IconButton size="sm" color="danger" onClick={() => setConfirmOpen(true)} disabled={deletingDepartment}>
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
              
              <List
                sx={{
                  '--ListItem-radius': '8px',
                  '--List-gap': '8px',
                  overflow: 'auto',
                  flexGrow: 1,
                }}
              >
                <Typography level="body2" sx={{ color: 'text.tertiary', mb: 1, pl: 1 }}>
                  FEATURES
                </Typography>
                <ListItem>
                  <ListItemButton
                    selected={selectedTab === 0}
                    onClick={() => setSelectedTab(0)}
                  >
                    💬 Chat
                  </ListItemButton>
                </ListItem>
                <ListItem>
                  <ListItemButton
                    selected={selectedTab === 1}
                    onClick={() => setSelectedTab(1)}
                  >
                    📁 Files
                  </ListItemButton>
                </ListItem>
                <ListItem>
                  <ListItemButton
                    selected={selectedTab === 2}
                    onClick={() => setSelectedTab(2)}
                  >
                    ✓ Daily Tasks
                  </ListItemButton>
                </ListItem>
              </List>
            </>
          )}
        </Sheet>

        {/* Main Content */}
        <Box
          sx={{
            flex: 1,
            p: { xs: 3, sm: 2, md: 0 },
            bgcolor: 'background.surface',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            overflow: 'auto',
            borderLeft: 'none',
            height: { xs: 'auto', md: '100vh' },
            boxSizing: 'border-box',
            width: '100%',
          }}
        >
          {!selectedDepartment || selectedDepartment.id === 'ceodesk' ? (
            // MyDesk or CEODesk Content
            <Box sx={{ flex: 1, p: 0, overflow: 'auto' }}>
              {isCEO() ? (
                <>
                  {myDeskTab === 0 && <GodsEye />}
                  {myDeskTab === 1 && <GlobalDailyTasks workspaceId={currentWorkspace?.id} />}
                  {myDeskTab === 2 && <TeamManagement />}
                </>
              ) : <GlobalDailyTasks workspaceId={currentWorkspace?.id} />}
            </Box>
          ) : (
            // Department Content
            <Department department={selectedDepartment} selectedTab={selectedTab} />
          )}

          {showTeammateModal && (
            <AddTeammateModal 
              open={showTeammateModal} 
              onClose={() => setShowTeammateModal(false)} 
            />
          )}
          <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
            <ModalDialog sx={{ minWidth: '40vw', minHeight: '20vh', maxWidth: '50vw', maxHeight: '40vh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
              <ModalClose />
              <Typography level="h5" component="h3" sx={{ mb: 2, marginTop: 2, color: 'text.primary' }}>
                Are you sure you want to delete this department? This action cannot be undone.
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button variant="plain" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                <Button color="danger" onClick={confirmDelete}>Delete</Button>
              </Box>
            </ModalDialog>
          </Modal>
        </Box>
      </Box>
  );
};

// Main App component with routing
function App() {
  return (
    <CssVarsProvider theme={theme} defaultMode="dark" disableTransitionOnChange>
      <AuthProvider>
        <Router>
          <AuthPersistenceHandler />
          <Routes>
            {/* Auth Routes */}
            <Route path="/" element={<Navigate to="/auth/welcome" replace />} />
            <Route path="/auth/welcome" element={<Welcome />} />
            <Route path="/auth/signin" element={<SignIn />} />
            <Route path="/auth/signup" element={<SignUp />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Workspace Routes */}
            <Route path="/workspace/selection" element={
              <PrivateRoute>
                <WorkspaceSelection />
              </PrivateRoute>
            } />
            <Route path="/workspace/create" element={
              <PrivateRoute>
                <WorkspaceCreation />
              </PrivateRoute>
            } />
            {/* <Route path="/team-management" element={
              <PrivateRoute>
                <TeamManagement />
              </PrivateRoute>
            } /> */}
            
            {/* Dashboard Route */}
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            
            {/* Workspace Dashboard Route */}
            {/* <Route path="/workspace/:workspaceId" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } /> */}
            
            {/* Redirect to welcome page if path doesn't match */}
            <Route path="*" element={<Navigate to="/auth/welcome" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </CssVarsProvider>
  );
}

export default App;