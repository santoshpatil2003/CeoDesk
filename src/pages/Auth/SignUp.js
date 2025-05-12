import React, { useState, useEffect, memo } from 'react';
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
  CircularProgress,
  Alert,
  FormHelperText,
  Grid,
  Snackbar
} from '@mui/joy';
// Using text arrow instead of icon due to MUI compatibility issues
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getUserWorkspaces } from '../../firebase/config';
// import { doc, getDoc } from 'firebase/firestore';
import google from '../../google.png';
import { addTeammateToTeam } from '../../firebase/addTeammateToTeam';
import { auth, db, getWorkspaceDetails } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { fetchSignInMethodsForEmail } from 'firebase/auth';

import RedirectIfAuthenticated from '../../components/RedirectIfAuthenticated';

const SignUp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, signIn, addWorkspaceToUser, setUserProfile, setWorkspaces, currentUser, userProfile } = useAuth();
  const searchParams = new URLSearchParams(location.search);
  const tokenParam = searchParams.get('token');
  

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    jobTitle: '',
    agreeToTerms: false
  });

  const [inviteInfo, setInviteInfo] = useState({ email: '', workspaceId: '', position: '' });
  const [emailLocked, setEmailLocked] = useState(false);
  const [jobTitleLocked, setJobTitleLocked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', color: 'danger' });
  const [inviteValidated, setInviteValidated] = useState(false);
  const [inviteExisting, setInviteExisting] = useState(false);

  // Parse and decode invite token on mount
  useEffect(() => {
    console.log('[SignUp] Decoding invite token:', tokenParam);
    if (tokenParam) {
      try {
        const decoded = atob(tokenParam);
        // email:workspaceId:position:timestamp
        const [email, workspaceId, position] = decoded.split(':');
        setFormData((prev) => ({ ...prev, email, jobTitle: position || '' }));
        setInviteInfo({ email, workspaceId, position: position || '' });
        setEmailLocked(true);
        setJobTitleLocked(true);
      } catch (err) {
        // Invalid token, ignore
        setInviteInfo({ email: '', workspaceId: '', position: '' });
        setEmailLocked(false);
        setJobTitleLocked(false);
      }
    }
  }, [tokenParam]);

  // Pre-validate invite and check if user exists
  useEffect(() => {
    if (!tokenParam) {
      setInviteValidated(true);
      return;
    }
    // decode and set inviteInfo
    const decoded = atob(tokenParam);
    const [email, workspaceId, position] = decoded.split(':');
    setInviteInfo({ email, workspaceId, position: position || '' });
    // check for existing sign-in methods
    fetchSignInMethodsForEmail(auth, email)
      .then(methods => setInviteExisting(methods.length > 0))
      .catch(console.error)
      .finally(() => setInviteValidated(true));
  }, [tokenParam]);

  // Pre-render check for existing account
  useEffect(() => {
    if (inviteInfo.email) {
      setInviteValidated(false);
      (async () => {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, inviteInfo.email);
          setInviteExisting(methods.length > 0);
        } catch (err) {
          console.error('Error checking existing account:', err);
        } finally {
          setInviteValidated(true);
        }
      })();
    }
  }, [inviteInfo.email]);

  // Auto-join for existing users with invite link
  useEffect(() => {
    if (inviteInfo.workspaceId) {
      console.log('[SignUp] Auto-join effect triggered:', inviteInfo, 'currentUser:', currentUser);
      (async () => {
        try {
          const finalJobTitle = inviteInfo.position || formData.jobTitle || 'Employee';
          if (currentUser) {
            // Auto-join signed-in user
            await addWorkspaceToUser(inviteInfo.workspaceId, currentUser.uid, finalJobTitle);
            await addTeammateToTeam(
              inviteInfo.workspaceId,
              currentUser.uid,
              {
                name: `${userProfile.firstname} ${userProfile.lastname}`,
                email: userProfile.email,
                jobTitle: finalJobTitle,
                uid: currentUser.uid
              }
            );
            navigate('/workspace/selection');
          } else {
            // Existing account but not signed in: lookup in Firestore
            console.log('[SignUp] Checking existing account in Firestore for email:', inviteInfo.email);
            const usersQuery = query(collection(db, 'Users'), where('email', '==', inviteInfo.email));
            const userSnap = await getDocs(usersQuery);
            console.log('[SignUp] Firestore userSnap empty?:', userSnap.empty);
            if (!userSnap.empty) {
              const userId = userSnap.docs[0].id;
              console.log('[SignUp] Found existing userId:', userId);
              await addWorkspaceToUser(inviteInfo.workspaceId, userId, finalJobTitle);
              await addTeammateToTeam(
                inviteInfo.workspaceId,
                userId,
                { name: inviteInfo.email, email: inviteInfo.email, jobTitle: finalJobTitle, uid: userId }
              );
              const wsDetails = await getWorkspaceDetails(inviteInfo.workspaceId);
              const workspaceName = wsDetails.companyName;
              console.log('[SignUp] Redirecting to SignIn');
              navigate('/auth/signin', {
                replace: true,
                state: {
                  snackbarMessage: `You already have an account in CEODesk please Sign In to access the ${workspaceName}`,
                  invite: inviteInfo
                }
              });
            }
          }
        } catch (err) {
          console.error('Auto-join error:', err);
        }
      })();
    }
  }, [inviteInfo.workspaceId, currentUser]);

  // Redirect an existing signed-out user immediately
  useEffect(() => {
    if (inviteValidated && inviteExisting && !currentUser) {
      const message = `You already have an account with CEODesk, please sign in to access this workspace.`;
      navigate('/auth/signin', { replace: true, state: { snackbarMessage: message, invite: inviteInfo } });
    }
  }, [inviteValidated, inviteExisting, currentUser]);

  // Show Snackbar and auto-redirect for existing signed-out users
  useEffect(() => {
    if (inviteValidated && inviteExisting && !currentUser) {
      const message = `You already have an account with CEODesk, please sign in to access this workspace.`;
      setSnackbar({ open: true, message, color: 'info' });
      const timer = setTimeout(() => {
        navigate('/auth/signin', { replace: true, state: { snackbarMessage: message, invite: inviteInfo } });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [inviteValidated, inviteExisting, currentUser]);

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    if (emailLocked && name === 'email') {
      // Prevent editing email if locked
      return;
    }
    if (jobTitleLocked && name === 'jobTitle') {
      // Prevent editing job title if locked
      return;
    }
    setFormData({
      ...formData,
      [name]: name === 'agreeToTerms' ? checked : value
    });
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    // Required fields
    if (!formData.firstName) errors.firstName = 'First name is required';
    if (!formData.lastName) errors.lastName = 'Last name is required';
    if (!formData.email) errors.email = 'Email is required';
    if (!formData.password) errors.password = 'Password is required';
    if (!formData.confirmPassword) errors.confirmPassword = 'Please confirm your password';
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (formData.password && formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    // Password match
    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    // Job title validation
    // if (!formData.jobTitle) {
    //   errors.jobTitle = 'Job title is required';
    // }
    
    // Terms agreement
    if (!formData.agreeToTerms) {
      errors.agreeToTerms = 'You must agree to the terms and conditions';
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    setLoading(true);
    e.preventDefault();
    setError('');
    setSnackbar({ open: false, message: '', color: 'danger' });
    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setError('Please fix the errors in the form');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Create account in Auth and Firestore
      const firstname = formData.firstName ? formData.firstName.trim() : '';
      const lastname = formData.lastName ? formData.lastName.trim() : '';
      const email = formData.email ? formData.email.trim() : '';
      const password = formData.password || '';
      if (!firstname || !lastname || !email || !password) {
        setError('All fields are required.');
        setLoading(false);
        return;
      }
      await signUp({ firstname, lastname, email, password });
      // 2. Sign in
      const signInUserObj = await signIn(formData.email, formData.password);
      // 3. If invited, join workspace
      if (inviteInfo.workspaceId && signInUserObj && signInUserObj.uid) {
        let finalJobTitle = inviteInfo.position || formData.jobTitle || 'Employee';
        if (typeof addWorkspaceToUser === 'function') {
          await addWorkspaceToUser(inviteInfo.workspaceId, signInUserObj.uid, finalJobTitle);
        }
        // Add user to Team collection in the workspace
        try {
          const { addTeammateToTeam } = await import('../../firebase/addTeammateToTeam');
          await addTeammateToTeam(inviteInfo.workspaceId, signInUserObj.uid, {
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            email: formData.email,
            jobTitle: finalJobTitle,
            uid: signInUserObj.uid
          });
          // --- Ensure UsersTitle is always in sync with Team ---
          const { getFirestore, doc, getDoc, updateDoc } = await import('firebase/firestore');
          const db = getFirestore();
          const teamDocRef = doc(db, 'Workspaces', inviteInfo.workspaceId, 'Team', signInUserObj.uid);
          const teamSnap = await getDoc(teamDocRef);
          if (teamSnap.exists()) {
            const jobTitle = teamSnap.data().jobTitle || finalJobTitle;
            const joinedWsDoc = doc(db, 'Users', signInUserObj.uid, 'joined_workspace', inviteInfo.workspaceId);
            await updateDoc(joinedWsDoc, { UsersTitle: jobTitle });
          }
        } catch (err) {
          // Optionally log or show error, but do not block signup
          console.error('Failed to add teammate to Team collection or sync UsersTitle:', err);
        }
      }
      // 4. Fetch workspaces and set context
      let joinedWorkspaces = {};
      joinedWorkspaces = await getUserWorkspaces(signInUserObj.uid);
      await setWorkspaces(joinedWorkspaces); // Ensure context is updated before continuing
      // 5. Wait for context propagation (guarantee context update)
      // eslint-disable-next-line no-async-promise-executor
      await new Promise(async (resolve) => {
        let tries = 0;
        const maxTries = 10;
        const interval = setInterval(() => {
          if (Object.keys(joinedWorkspaces).length > 0) {
            clearInterval(interval);
            resolve();
          } else if (++tries > maxTries) {
            clearInterval(interval);
            resolve(); // fallback, still redirect
          }
        }, 100);
      });
      // 6. Redirect only if everything succeeded
      navigate('/workspace/select');
    } catch (error) {
      let errorMessage = 'Failed to create account. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use. Please try signing in instead.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format. Please enter a valid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      }
      setError(errorMessage);
      setSnackbar({ open: true, message: errorMessage, color: 'danger' });
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Box
        sx={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at center, #1E1E1E 0%, #121212 100%)',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 2000
        }}
      >
        <CircularProgress size="lg" />
      </Box>
    );
  }

  // Guard render: spinner or null until validation passes
  if (!inviteValidated) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size="lg" />
      </Box>
    );
  }
  if (inviteExisting && !currentUser) {
    return null;
  }

  return (
    <RedirectIfAuthenticated>
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
          background: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm63 31c1.657 0 3-1.343 3-3s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM34 90c1.657 0 3-1.343 3-3s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm56-76c1.657 0 3-1.343 3-3s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%23ffffff\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
        }}
      />

      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        
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
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
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
                Create an Account
              </Typography>
              <Box sx={{ width: 40 }} /> {/* Spacer for balance */}
            </Box>

            <Typography level="body2" sx={{ textAlign: 'center', mb: 2, color: 'text.secondary' }}>
              Join CEODesk to streamline your workflow
            </Typography>

            {error && (
              <Alert color="danger" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>


              {/* Personal Information */}
              {/* <Typography level="title-md" sx={{ mb: 1 }}>
                Personal Information
              </Typography> */}
              
              <Grid container spacing={1} sx={{ mb: 1 }}>
                <Grid xs={12} sm={6}>
                  <FormControl error={!!formErrors.firstName}>
                    <FormLabel>First Name</FormLabel>
                    <Input
                      name="firstName"
                      placeholder="Enter your first name"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                    />
                    {formErrors.firstName && (
                      <FormHelperText>{formErrors.firstName}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl error={!!formErrors.lastName}>
                    <FormLabel>Last Name</FormLabel>
                    <Input
                      name="lastName"
                      placeholder="Enter your last name"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                    />
                    {formErrors.lastName && (
                      <FormHelperText>{formErrors.lastName}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl error={!!formErrors.email}>
                    <FormLabel>Email</FormLabel>
                    <Input
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={emailLocked}
                    />
                    {formErrors.email && (
                      <FormHelperText>{formErrors.email}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl error={!!formErrors.jobTitle}>
                    <FormLabel>Job Title / Position</FormLabel>
                    <Input
                      name="jobTitle"
                      type="text"
                      placeholder="e.g. Marketing Manager"
                      value={formData.jobTitle}
                      onChange={handleChange}
                      required
                      disabled={jobTitleLocked}
                      sx={{color: 'text.primary'}}
                    />
                    {formErrors.jobTitle && (
                      <FormHelperText>{formErrors.jobTitle}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
              </Grid>

              {/* Account Information */}
              {/* <Typography level="title-md" sx={{ mb: 1 }}>
                Account Information
              </Typography> */}
              
              <Grid container spacing={1} sx={{ mb: 1 }}>
                <Grid xs={12} sm={6}>
                  <FormControl error={!!formErrors.password}>
                    <FormLabel>Password</FormLabel>
                    <Input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password"
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
                      sx={{color: 'text.primary'}}
                    />
                    {formErrors.password && (
                      <FormHelperText>{formErrors.password}</FormHelperText>
                    )}
                    {!formErrors.password && (
                      <FormHelperText>
                        At least 8 characters with letters and numbers
                      </FormHelperText>
                    )}
                  </FormControl>
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl error={!!formErrors.confirmPassword}>
                    <FormLabel>Confirm Password</FormLabel>
                    <Input
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      sx={{color: 'text.primary'}}
                      required
                    />
                    {formErrors.confirmPassword && (
                      <FormHelperText>{formErrors.confirmPassword}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
              </Grid>

              {/* Work Information */}
              {/* <Typography level="title-md" sx={{ mb: 1 }}>
                Work Information
              </Typography>
              
              <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid xs={12}>
                  <FormControl error={!!formErrors.jobTitle}>
                    <FormLabel>Job Title</FormLabel>
                    <Input
                      name="jobTitle"
                      placeholder="Enter your job title"
                      value={formData.jobTitle}
                      onChange={handleChange}
                      required
                    />
                    {formErrors.jobTitle && (
                      <FormHelperText>{formErrors.jobTitle}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
              </Grid> */}

              {/* Terms and Conditions */}
              <FormControl error={!!formErrors.agreeToTerms} sx={{ mb: 0 }}>
                <Checkbox
                  name="agreeToTerms"
                  label={
                    <Typography level="body2">
                      I agree to the{' '}
                      <Link href="#" fontWeight="lg">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link href="#" fontWeight="lg">
                        Privacy Policy
                      </Link>
                    </Typography>
                  }
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                />
                {formErrors.agreeToTerms && (
                  <FormHelperText>{formErrors.agreeToTerms}</FormHelperText>
                )}
              </FormControl>

              {/* Group all buttons and divider in a fragment to fix JSX parent error */}
              <React.Fragment>
                <Button 
                  type="submit" 
                  fullWidth 
                  loading={loading}
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>

                <Divider sx={{ my: 2 }}>or</Divider>

                <Button
                  variant="outlined"
                  color="neutral"
                  fullWidth
                  startDecorator={<img style={{ width: '24px', height: '24px' }} src={google} alt="Google" />}
                  sx={{ mb: 1, fontSize: '1rem' }}
                >
                  Sign up with Google
                </Button>
              </React.Fragment>

              <Typography level="body2" textAlign="center">
                Already have an account?{' '}
                <Link
                  component="button"
                  type="button"
                  onClick={() => navigate('/auth/signin')}
                >
                  Sign in
                </Link>
              </Typography>
            </form>

            {/* Snackbar for error feedback */}
            {snackbar.open && (
              <Box sx={{ position: 'fixed', bottom: 32, right: 32, zIndex: 2000 }}>
                <Alert color={snackbar.color} variant="solid" onClose={() => setSnackbar({ ...snackbar, open: false })}>
                  {snackbar.message}
                </Alert>
              </Box>
            )}
          </CardContent>
        </Card>

        <Typography
          level="body3"
          sx={{ textAlign: 'center', mt: 4, color: 'text.tertiary' }}
        >
          {new Date().getFullYear()} CEODesk. All rights reserved.
        </Typography>
      </Container>
    </Box>
  </RedirectIfAuthenticated>
  );
};

// Wrap component in React.memo to avoid unnecessary rerenders
export default memo(SignUp);
