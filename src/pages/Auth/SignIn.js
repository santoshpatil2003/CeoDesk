import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  FormControl,
  FormLabel,
  Input,
  Link,
  Checkbox,
  Divider,
  IconButton,
  Container,
  RadioGroup,
  Radio,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/joy';
// Using text arrow instead of icon due to MUI compatibility issues
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import google from '../../google.png';
import { addTeammateToTeam } from '../../firebase/addTeammateToTeam';

import RedirectIfAuthenticated from '../../components/RedirectIfAuthenticated';

// Static anchor for Snackbar to avoid re-creation
const SNACKBAR_ANCHOR = { vertical: 'top', horizontal: 'center' };

const SignIn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, addWorkspaceToUser } = useAuth();
  const searchParams = new URLSearchParams(location.search);
  const typeParam = searchParams.get('type');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Memoize snackbar message and open flag
  const snackbarMessage = useMemo(() => location.state?.snackbarMessage || '', [location.state]);
  const [snackbarOpen, setSnackbarOpen] = useState(() => !!snackbarMessage);
  useEffect(() => { if (snackbarMessage) setSnackbarOpen(true); }, [snackbarMessage]);

  // Stable handler to update form data
  const handleChange = useCallback((e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'rememberMe' ? checked : value
    }));
  }, []);

  // Stable submission handler
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      // Sign in with Firebase
      const user = await signIn(formData.email, formData.password);
      
      // If redirected via invite, auto-join workspace
      const invite = location.state?.invite;
      if (invite?.workspaceId) {
        const finalJobTitle = invite.position || 'Employee';
        await addWorkspaceToUser(invite.workspaceId, user.uid, finalJobTitle);
        await addTeammateToTeam(
          invite.workspaceId,
          user.uid,
          { name: invite.email || user.email, email: invite.email || user.email, jobTitle: finalJobTitle, uid: user.uid }
        );
      }
      
      // Store email in localStorage if remember me is checked
      if (formData.rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      // Redirect to workspace selection after successful authentication
      navigate('/workspace/selection');
    } catch (error) {
      let errorMessage = 'Failed to sign in. Please check your credentials.';
      
      // Handle specific Firebase error codes
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later or reset your password.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled. Please contact support.';
      }
      
      setError(errorMessage);
      console.error('Sign in error:', error);
    } finally {
      setLoading(false);
    }
  }, [formData, signIn, addWorkspaceToUser, location.state, navigate]);

  return (
    <RedirectIfAuthenticated>
      {/* Invite info snackbar */}
      {snackbarOpen && (
        <Snackbar
          open={snackbarOpen}
          onClose={() => setSnackbarOpen(false)}
          autoHideDuration={6000}
          anchorOrigin={SNACKBAR_ANCHOR}
        >
          <Alert color="info">{snackbarMessage}</Alert>
        </Snackbar>
      )}
      <Box
      sx={{
        height: { xs: 'auto', md: '100vh' },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at center, #1E1E1E 0%, #121212 100%)',
        backgroundSize: 'cover',
        position: 'relative',
        overflow: 'hidden',
        p: { xs: 3, sm: 2, md: 1 },
      }}
    >
      {/* Background decoration */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          opacity: 0.1,
          background: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%23ffffff\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
        }}
      />
      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        
        <Card
          sx={{
            backgroundColor: 'rgba(18, 18, 18, 0.8)',
            backdropFilter: 'blur(10px)',
            borderRadius: 'xl',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
            overflow: 'auto',
            maxHeight: 'calc(100vh - 120px)',
          }}
        >
          <CardContent sx={{ p: 1 }}>
            {/* Header with Back Button and Title */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Button 
                onClick={() => navigate('/')}
                variant="plain"
                color="neutral"
                size="sm"
                sx={{ mr: 'auto' }}
              >
                ←
              </Button>
              <Typography level="h2" sx={{ flex: 1, textAlign: 'center' }}>
                Sign In
              </Typography>
              <Box sx={{ width: 40 }} /> {/* Spacer for balance */}
            </Box>

            <Typography level="body2" sx={{ textAlign: 'center', mb: 2, color: 'text.secondary' }}>
              Welcome back! Please enter your details
            </Typography>
            
            {/* Test Credentials */}
            {/* <Box sx={{ mb: 2, p: 1, bgcolor: 'background.level1', borderRadius: 'sm' }}>
              <Typography level="body2" fontWeight="bold" sx={{ mb: 1 }}>
                Test Credentials:
              </Typography>
              <Typography level="body3" sx={{ display: 'block', mb: 0.5 }}>
                <b>CEO:</b> ceo@example.com / ceopass123
              </Typography>
              <Typography level="body3" sx={{ display: 'block' }}>
                <b>Employee:</b> employee@example.com / emppass123
              </Typography>
            </Box> */}


            {error && (
              <Alert color="danger" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>


              <FormControl sx={{ mb: 2 }}>
                <FormLabel>Email</FormLabel>
                <Input
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  sx={{
                    '--Input-focusedThickness': '2px',
                    '&:focus-within': {
                      borderColor: 'primary.500',
                    },
                  }}
                />
              </FormControl>

              <FormControl sx={{ mb: 3 }}>
                <FormLabel>Password</FormLabel>
                <Input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  endDecorator={
                    <IconButton
                      variant="plain"
                      color="neutral"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </IconButton>
                  }
                  sx={{
                    '--Input-focusedThickness': '2px',
                    '&:focus-within': {
                      borderColor: 'primary.500',
                    },
                  }}
                />
              </FormControl>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 3,
                }}
              >
                <Checkbox
                  name="rememberMe"
                  label="Remember me"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                />
                <Link
                  component="button"
                  type="button"
                  level="body2"
                  onClick={() => navigate('/auth/forgot-password')}
                >
                  Forgot password?
                </Link>
              </Box>


              <Button
                type="submit"
                loading={loading}
                loadingIndicator="Signing in…"
                fullWidth
                sx={{ mt: 3 }}
              >
                Sign In
              </Button>

              <Divider sx={{ my: 2 }}>or</Divider>

              <Button
                variant="outlined"
                color="neutral"
                fullWidth
                startDecorator={<img style={{ width: '24px', height: '24px' }} src={google} alt="Google" />}
                sx={{ mb: 1, fontSize: '1rem' }}
              >
                Sign in with Google
              </Button>

              <Typography level="body2" textAlign="center">
                Don't have an account?{' '}
                <Link
                  component="button"
                  type="button"
                  onClick={() => navigate(`/auth/signup?type=${formData.userType}`)}
                >
                  Sign up
                </Link>
              </Typography>
            </form>
          </CardContent>
        </Card>
      </Container>
      <Typography
        level="body3"
        sx={{ textAlign: 'center', mt: 4, color: 'text.tertiary' }}
      >
        {`© ${new Date().getFullYear()} CEODesk. All rights reserved.`}
      </Typography>
    </Box>
  </RedirectIfAuthenticated>
  );
}

// Memoize component to avoid unnecessary re-renders
export default memo(SignIn);
