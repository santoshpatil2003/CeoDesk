import React, { useState } from 'react';
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
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  Option,
  Stack,
  Avatar,
  CircularProgress
} from '@mui/joy';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const WorkspaceCreation = () => {
  const navigate = useNavigate();
  const { currentUser, isCEO, setActiveWorkspace } = useAuth();
  
  // Form state
  const [companyName, setCompanyName] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Industry options
  const industryOptions = [
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Manufacturing',
    'Retail',
    'Media & Entertainment',
    'Real Estate',
    'Transportation',
    'Energy',
    'Other'
  ];

  // Company size options
  const companySizeOptions = [
    '1-10 employees',
    '11-50 employees',
    '51-200 employees',
    '201-500 employees',
    '501-1000 employees',
    '1001+ employees'
  ];

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }
    
    if (!companyDescription.trim()) {
      newErrors.companyDescription = 'Company description is required';
    }
    
    if (!industry) {
      newErrors.industry = 'Industry is required';
    }
    
    if (!companySize) {
      newErrors.companySize = 'Company size is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setIsSubmitting(true);
    try {
      // Create workspace in Firestore and associate with user
      const { createWorkspace } = await import('../../firebase/config');
      const workspaceId = await createWorkspace({
        companyName,
        companyDescription,
        industry,
        companySize
      }, currentUser.uid);
      // Set as active workspace and redirect to workspace dashboard
      if (workspaceId) {
        await setActiveWorkspace(workspaceId);
        navigate(`/workspace/${workspaceId}`);
      }
    } catch (error) {
      console.error('Error creating workspace:', error);
      alert('Failed to create workspace. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate('/workspace/selection');
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
                {isCEO() ? 'CEO' : currentUser?.jobTitle || 'Employee'}
              </Typography>
            </Box>
          </Box>
          
          <Button 
            variant="outlined" 
            color="neutral" 
            size="sm"
            onClick={handleCancel}
          >
            Cancel
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
            <CardContent sx={{ p: 3 }}>
              <Typography level="h2" sx={{ mb: 1 }}>
                Create New Workspace
              </Typography>
              <Typography level="body-md" sx={{ mb: 4, color: 'text.secondary' }}>
                Set up your company workspace to start collaborating with your team.
              </Typography>

              <form onSubmit={handleSubmit}>
                <Stack spacing={3} sx={{ mb: 4 }}>
                  <FormControl error={!!errors.companyName}>
                    <FormLabel>Company Name*</FormLabel>
                    <Input
                      placeholder="Enter your company name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      sx={{ mb: errors.companyName ? 0 : 1, color: 'text.primary' }}
                    />
                    {errors.companyName && (
                      <Typography level="body-xs" color="danger" sx={{ mt: 0.5 }}>
                        {errors.companyName}
                      </Typography>
                    )}
                  </FormControl>

                  <FormControl error={!!errors.companyDescription}>
                    <FormLabel>Company Description*</FormLabel>
                    <Textarea
                      placeholder="Briefly describe your company"
                      minRows={3}
                      maxRows={5}
                      value={companyDescription}
                      onChange={(e) => setCompanyDescription(e.target.value)}
                      sx={{ mb: errors.companyDescription ? 0 : 1, color: 'text.primary' }}
                    />
                    {errors.companyDescription && (
                      <Typography level="body-xs" color="danger" sx={{ mt: 0.5 }}>
                        {errors.companyDescription}
                      </Typography>
                    )}
                  </FormControl>

                  <Grid container spacing={2}>
                    <Grid xs={12} sm={6}>
                      <FormControl error={!!errors.industry}>
                        <FormLabel>Industry*</FormLabel>
                        <Select
                          placeholder="Select industry"
                          value={industry}
                          onChange={(e, newValue) => setIndustry(newValue)}
                          sx={{ mb: errors.industry ? 0 : 1, color: 'text.primary' }}
                        >
                          {industryOptions.map((option) => (
                            <Option key={option} value={option} sx={{ color: 'text.primary' }}>
                              {option}
                            </Option>
                          ))}
                        </Select>
                        {errors.industry && (
                          <Typography level="body-xs" color="danger" sx={{ mt: 0.5 }}>
                            {errors.industry}
                          </Typography>
                        )}
                      </FormControl>
                    </Grid>
                    <Grid xs={12} sm={6}>
                      <FormControl error={!!errors.companySize}>
                        <FormLabel>Company Size*</FormLabel>
                        <Select
                          placeholder="Select company size"
                          value={companySize}
                          onChange={(e, newValue) => setCompanySize(newValue)}
                          sx={{ mb: errors.companySize ? 0 : 1, color: 'text.primary' }}
                        >
                          {companySizeOptions.map((option) => (
                            <Option key={option} value={option} sx={{ color: 'text.primary' }}>
                              {option}
                            </Option>
                          ))}
                        </Select>
                        {errors.companySize && (
                          <Typography level="body-xs" color="danger" sx={{ mt: 0.5 }}>
                            {errors.companySize}
                          </Typography>
                        )}
                      </FormControl>
                    </Grid>
                  </Grid>
                </Stack>

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    color="neutral"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    Create Workspace
                  </Button>
                </Box>
              </form>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </Box>
  );
};

export default WorkspaceCreation;
