import React, { useState } from 'react';
import { Box, Button, Input, Typography, Modal } from '@mui/joy';

const DepartmentCreate = ({ onCreateDepartment }) => {
  const [open, setOpen] = useState(false);
  const [departmentName, setDepartmentName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (departmentName.trim()) {
      onCreateDepartment(departmentName);
      setDepartmentName('');
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        startDecorator="+"
        onClick={() => setOpen(true)}
        variant="solid"
        color="primary"
        sx={{
          bgcolor: 'primary.600',
          '&:hover': {
            bgcolor: 'primary.700',
          },
          boxShadow: '0 3px 5px rgba(0, 0, 0, 0.3)',
          width: '100%',
        }}
      >
        Create Department
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            p: 3,
            bgcolor: 'background.surface',
            borderRadius: 'md',
            width: 400,
            border: '1px solid',
            borderColor: 'rgba(255, 255, 255, 0.4)',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.5)',
          }}
        >
          <Typography level="h4" mb={2}>
            Create New Department
          </Typography>
          <Input
            fullWidth
            placeholder="Department Name"
            value={departmentName}
            onChange={(e) => setDepartmentName(e.target.value)}
            required
            sx={{ 
              mb: 2,
              '--Input-focusedThickness': '2px',
              '--Input-focusedHighlight': 'primary.500',
              borderColor: 'rgba(255, 255, 255, 0.4)',
              '&:hover': {
                borderColor: 'primary.400',
              },
            }}
          />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              variant="plain"
              color="neutral"
              onClick={() => setOpen(false)}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  bgcolor: 'background.level2',
                },
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="solid"
              sx={{
                bgcolor: 'primary.600',
                '&:hover': {
                  bgcolor: 'primary.700',
                },
              }}
            >
              Create
            </Button>
          </Box>
        </Box>
      </Modal>
    </>
  );
};

export default DepartmentCreate;
