import React from 'react';
import { Box, Typography, Button, Card, CardContent, Container } from '@mui/joy';
import { useNavigate } from 'react-router-dom';

const Unauthorized = () => {
  const navigate = useNavigate();

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
          <CardContent sx={{ p: 3, textAlign: 'center' }}>
            <Typography level="h1" sx={{ mb: 2, color: 'danger.500' }}>
              401
            </Typography>
            <Typography level="h3" sx={{ mb: 3 }}>
              Unauthorized Access
            </Typography>
            <Typography level="body1" sx={{ mb: 4 }}>
              You don't have permission to access this feature. Please contact your administrator if you believe this is an error.
            </Typography>
            <Button
              variant="solid"
              color="primary"
              size="lg"
              onClick={() => navigate('/')}
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Unauthorized;
