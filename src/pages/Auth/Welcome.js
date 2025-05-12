import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Stack, 
  Divider,
  Container
} from '@mui/joy';
import { useNavigate } from 'react-router-dom';

import RedirectIfAuthenticated from '../../components/RedirectIfAuthenticated';

const Welcome = () => {
  const navigate = useNavigate();

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
          background: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%23ffffff\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
        }}
      />

      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Card
          sx={{
            maxWidth: 700,
            mx: 'auto',
            backgroundColor: 'rgba(18, 18, 18, 0.8)',
            backdropFilter: 'blur(10px)',
            borderRadius: 'xl',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 5px rgba(255, 255, 255, 0.1)',
            overflow: 'auto',
            maxHeight: 'calc(100vh - 50px)',
          }}
        >
          <CardContent sx={{ p: 2 }}>
            {/* Logo and Title */}
            <Box sx={{ textAlign: 'center', mb: 1 }}>
              <Typography
                level="h1"
                sx={{
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  background: 'linear-gradient(45deg, #007FFF, #0059B2)',
                  backgroundClip: 'text',
                  textFillColor: 'transparent',
                  mb: 1,
                }}
              >
                CEODesk
              </Typography>
              <Typography level="body1" sx={{ color: 'text.secondary' }}>
                Your complete workspace management solution
              </Typography>
            </Box>


            <Divider sx={{ my: 1 }} />

            {/* Value proposition */}
            <Typography level="body1" sx={{ mb: 1, textAlign: 'center', color: 'text.secondary' }}>
              Streamline your workflow, enhance team collaboration, and gain valuable insights with our comprehensive platform.
            </Typography>

            {/* App features showcase */}
            <Box sx={{ mb: 3 }}>
              <Typography level="h3" sx={{ mb: 2, textAlign: 'center' }}>
                Features
              </Typography>
              
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
                <Card
                  variant="outlined"
                  sx={{
                    flex: 1,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    p: 1,
                    textAlign: 'center'
                  }}
                >
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: '50%',
                      bgcolor: 'primary.900',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 1,
                    }}
                  >
                    <Typography level="h3">👁️</Typography>
                  </Box>

                  <Typography level="title-lg" sx={{ mb: 1 }}>
                    Godseye
                  </Typography>
                  <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                    Complete visibility of your workspace activity
                  </Typography>
                </Card>

                <Card
                  variant="outlined"
                  sx={{
                    flex: 1,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    p: 1,
                    textAlign: 'center'
                  }}
                >
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: '50%',
                      bgcolor: 'primary.800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 1,
                    }}
                  >
                    <Typography level="h3">👥</Typography>
                  </Box>

                  <Typography level="title-lg" sx={{ mb: 1 }}>
                    Team Collaboration
                  </Typography>
                  <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                    Seamless communication and file sharing
                  </Typography>
                </Card>
                
                <Card
                  variant="outlined"
                  sx={{
                    flex: 1,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    p: 1,
                    textAlign: 'center'
                  }}
                >
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: '50%',
                      bgcolor: 'primary.700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 1,
                    }}
                  >
                    <Typography level="h3">📊</Typography>
                  </Box>

                  <Typography level="title-lg" sx={{ mb: 1 }}>
                    Analytics
                  </Typography>
                  <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                    Insights and reports on workspace performance
                  </Typography>
                </Card>
              </Stack>
            </Box>


            {/* Sign in/up buttons */}
            <Stack direction="column" spacing={2} sx={{ maxWidth: 300, mx: 'auto' }}>
              <Button
                variant="solid"
                color="primary"
                size="lg"
                startDecorator="🔐"
                onClick={() => navigate('/auth/signin')}
              >
                Sign In
              </Button>
              <Button
                variant="outlined"
                color="neutral"
                size="lg"
                startDecorator="✨"
                onClick={() => navigate('/auth/signup')}
              >
                Create Account
              </Button>
              <Typography level="body-sm" textAlign="center" sx={{ color: 'text.tertiary', mt: 1 }}>
                The first user to create a workspace becomes the administrator
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Container>
      <Typography
        level="body3"
        sx={{ textAlign: 'center', mt: 2, color: 'text.tertiary' }}
      >
        &copy; {new Date().getFullYear()} CEODesk. All rights reserved.
      </Typography>
    </Box>
  </RedirectIfAuthenticated>
);

}
export default Welcome;
