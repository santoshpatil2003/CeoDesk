import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Divider,
  Sheet,
  List,
  ListItem,
  ListItemButton,
  AspectRatio,
  Stack,
  Avatar,
  CircularProgress
} from '@mui/joy';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const WorkspaceSelection = () => {
  const navigate = useNavigate();
  const { currentUser, isCEO, signOut, setActiveWorkspace, workspaces: workspacesContext } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [memberCounts, setMemberCounts] = useState({}); // { [workspaceId]: count }

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [selectingWorkspaceId, setSelectingWorkspaceId] = useState(null);

  // Sync with AuthContext's workspaces
  useEffect(() => {
    if (workspacesContext && Object.keys(workspacesContext).length > 0) {
      // Convert object to array of workspace cards
      const wsList = Object.entries(workspacesContext).map(([wsId, wsObj]) => ({ id: wsId, ...wsObj }));
      setWorkspaces(wsList);
      setLoading(false);
      setError('');
      // Fetch member counts for each workspace
      fetchAllMemberCounts(wsList);
      return;
    }
    // Fallback: fetch user workspaces from Firestore if context is empty
    const fetchWorkspaces = async () => {
      setLoading(true);
      setError('');
      try {
        if (!currentUser) {
          setWorkspaces([]);
          setLoading(false);
          return;
        }
        // Always fetch joined workspaces from Firestore to ensure up-to-date info
        if (!currentUser?.uid) {
          setWorkspaces([]);
          setLoading(false);
          return;
        }
        const { getUserWorkspaces, getWorkspaceDetails } = await import('../../firebase/config');
        const joinedWorkspacesObj = await getUserWorkspaces(currentUser.uid);
        console.log('joinedWorkspacesObj:', joinedWorkspacesObj);
        const wsList = [];
        let skippedWorkspaces = [];
        for (const wsId of Object.keys(joinedWorkspacesObj)) {
          try {
            console.log('Fetching workspace details for:', wsId);
            const wsDetails = await getWorkspaceDetails(wsId);
            console.log('wsDetails:', wsDetails);
            if (wsDetails) {
              wsList.push({ id: wsId, ...wsDetails, UsersTitle: joinedWorkspacesObj[wsId]?.UsersTitle });
            } else {
              skippedWorkspaces.push(wsId);
            }
          } catch (err) {
            console.warn('Skipping workspace due to error:', wsId, err);
            skippedWorkspaces.push(wsId);
            continue;
          }
        }
        if (skippedWorkspaces.length > 0) {
          setError(`Some workspaces could not be loaded: ${skippedWorkspaces.join(', ')}`);
        }
        setWorkspaces(wsList);
      } catch (err) {
        setError('Failed to load workspaces.');
        setWorkspaces([]);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkspaces();
  }, [currentUser, workspacesContext]);

  // Fetch member counts for all workspaces
  const fetchAllMemberCounts = async (wsList) => {
    const { getTeamMemberCount } = await import('../../firebase/getTeamMemberCount');
    const counts = {};
    await Promise.all(wsList.map(async (ws) => {
      try {
        const teamCount = await getTeamMemberCount(ws.id);
        counts[ws.id] = teamCount + 1; // +1 for CEO
      } catch {
        counts[ws.id] = 1; // fallback
      }
    }));
    setMemberCounts(counts);
  };

  // Refetch member counts if workspaces change
  useEffect(() => {
    if (workspaces.length > 0) fetchAllMemberCounts(workspaces);
  }, [workspaces]);

  const handleCreateWorkspace = () => {
    navigate('/workspace/create');
  };

  const handleSelectWorkspace = async (workspace) => {
    setSelectingWorkspaceId(workspace.id);
    setSelectedWorkspace(workspace);
    try {
      await setActiveWorkspace(workspace.id);
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to select workspace.');
    } finally {
      setSelectingWorkspaceId(null);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth/signin');
    } catch (error) {
      console.error('Failed to sign out', error);
    }
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

  if (loading) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at center, #1E1E1E 0%, #121212 100%)' }}>
        <CircularProgress size="lg" />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: { xs: 'auto', md: '100vh' },
        display: 'flex',
        flexDirection: 'column',
        background: 'radial-gradient(circle at center, #1E1E1E 0%, #121212 100%)',
        backgroundSize: 'cover',
        position: 'relative',
        overflow: 'hidden',
        p: { xs: 3, sm: 2, md: 0 },
      }}
    >
      {/* Overlay spinner when selecting workspace */}
      {selectingWorkspaceId && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            bgcolor: 'rgba(20,20,20,0.65)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress size="lg" color="primary" thickness={3} />
        </Box>
      )}
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
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
              {currentUser?.name ? getInitials(currentUser.name) : '?'}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography level="title-sm" sx={{ fontWeight: 'md' }}>
                {currentUser?.name || 'User'}
              </Typography>
              <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                {isCEO() ? 'CEO' : (currentUser?.role || 'Employee')}
              </Typography>
            </Box>
          </Box>
          
          <Button 
            variant="outlined" 
            color="neutral" 
            size="sm"
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
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
            <CardContent sx={{ p: 2 }}>
              <Grid container spacing={2}>
                {workspaces.map((workspace) => (
                  <Grid key={workspace.id} xs={12} sm={6} md={4}>
                    <Card
                      variant="outlined"
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 2,
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        borderStyle: 'solid',
                        borderColor: 'primary.500',
                        '&:hover': {
                          borderColor: 'primary.500',
                          transform: 'translateY(-4px)',
                          boxShadow: '0 6px 20px rgba(0, 127, 255, 0.2)',
                        },
                      }}
                      onClick={() => handleSelectWorkspace(workspace)}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                          <Avatar
                            variant="soft"
                            color="primary"
                            sx={{ width: 60, height: 60 }}
                          >
                            {getInitials(workspace.companyName || 'Workspace')}
                          </Avatar>
                        </Box>
                        <Typography level="title-lg" sx={{ mb: 0.5, textAlign: 'center' }}>
                          {workspace.companyName || 'Untitled Workspace'}
                        </Typography>
                        <Typography level="body-sm" sx={{ mb: 2, color: 'text.secondary', textAlign: 'center' }}>
                          {workspace.companyDescription || 'No description provided.'}
                        </Typography>
                        <Stack direction="row" justifyContent="center" sx={{ mt: 1 }}>
                          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                            {(memberCounts[workspace.id] !== undefined ? memberCounts[workspace.id] : '...')} member{(memberCounts[workspace.id] === 1 ? '' : 's')}
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                <Grid xs={12} sm={6} md={4}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 2,
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                      borderStyle: 'dashed',
                      borderColor: 'primary.500',
                      '&:hover': {
                        borderColor: 'primary.600',
                        transform: 'translateY(-4px)',
                        boxShadow: '0 6px 20px rgba(0, 127, 255, 0.2)',
                        bgcolor: 'primary.800',
                      },
                    }}
                    onClick={handleCreateWorkspace}
                  >
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        bgcolor: 'primary.800',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                      }}
                    >
                      <Typography level="h2">+</Typography>
                    </Box>
                    <Typography level="title-lg" sx={{ mb: 1 }}>
                      Create New Workspace
                    </Typography>
                    <Typography level="body-sm" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                      Set up a new company workspace
                    </Typography>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Container>
      </Box>

      {/* Footer */}
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
          {new Date().getFullYear()} CEODesk. All rights reserved.
        </Typography>
      </Sheet>
    </Box>
  );
};

export default WorkspaceSelection;
