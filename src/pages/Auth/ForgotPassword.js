import React, { useState } from 'react';
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
  Container,
  Alert,
  CircularProgress
} from '@mui/joy';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    try {
      setLoading(true);
      await resetPassword(email);
      setSuccess(true);
    } catch (error) {
      setError('Failed to send password reset email. Please try again.');
      console.error('Password reset error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at center, #1E1E1E 0%, #121212 100%)',
        backgroundSize: 'cover',
        position: 'relative',
        overflow: 'hidden',
        p: 2,
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
        <Box sx={{ mb: 2 }}>
          <Button
            variant="plain"
            color="neutral"
            startDecorator="←"
            onClick={() => navigate('/auth/signin')}
            sx={{ mb: 2 }}
          >
            Back to Sign In
          </Button>
        </Box>
        
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
          <CardContent sx={{ p: 3 }}>
            {/* Logo and Title */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography level="h2" sx={{ mb: 1 }}>
                Reset Password
              </Typography>
              <Typography level="body2" sx={{ color: 'text.secondary' }}>
                Enter your email to receive a password reset link
              </Typography>
            </Box>

            {error && (
              <Alert color="danger" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {success ? (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Alert color="success" sx={{ mb: 3 }}>
                  Password reset link sent! Please check your email.
                </Alert>
                <Typography level="body2" sx={{ mb: 3 }}>
                  We've sent a password reset link to <strong>{email}</strong>. 
                  Please check your inbox and follow the instructions to reset your password.
                </Typography>
                <Button
                  variant="outlined"
                  color="neutral"
                  onClick={() => navigate('/auth/signin')}
                >
                  Return to Sign In
                </Button>
              </Box>
            ) : (
              <form onSubmit={handleSubmit}>
                <FormControl sx={{ mb: 3 }}>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    sx={{
                      '--Input-focusedThickness': '2px',
                      '&:focus-within': {
                        borderColor: 'primary.500',
                      },
                    }}
                  />
                </FormControl>

                <Button
                  type="submit"
                  loading={loading}
                  fullWidth
                  sx={{ mb: 3 }}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>

                <Typography level="body2" textAlign="center">
                  Remember your password?{' '}
                  <Link
                    component="button"
                    type="button"
                    onClick={() => navigate('/auth/signin')}
                  >
                    Sign in
                  </Link>
                </Typography>
              </form>
            )}
          </CardContent>
        </Card>

        <Typography
          level="body3"
          sx={{ textAlign: 'center', mt: 4, color: 'text.tertiary' }}
        >
          © {new Date().getFullYear()} CEODesk. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
};

export default ForgotPassword;
