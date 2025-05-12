import React, { useState, useEffect } from 'react';
import { Box, List, ListItem, ListItemButton, Typography, Tooltip, Sheet, Modal, ModalDialog, Input, Button } from '@mui/joy';
import UserProfile from './UserProfile';
import { useAuth } from '../contexts/AuthContext';

// removed unused Firestore subscription import

const DepartmentSidebar = ({ departments: departmentsProp, selectedDepartment, onSelectDepartment, onCreateDepartment, onGoHome }) => {
  const { currentWorkspace, currentUser, isCEO } = useAuth();
  const [openModal, setOpenModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (newDeptName.trim()) {
      try {
        const { createDepartment } = await import('../firebase/config');
        const workspaceId = currentWorkspace && currentWorkspace.id ? currentWorkspace.id : null;
        if (!workspaceId) {
          throw new Error('Workspace ID is missing or invalid');
        }
        await createDepartment(workspaceId, { name: newDeptName, createdByUid: currentUser.uid });
        setNewDeptName('');
        handleCloseModal();
      } catch (err) {
        console.error('Department creation error:', err);
        alert('Failed to create department: ' + (err && err.message ? err.message : err));
      }
    }
  };

  // Use departmentsProp for rendering departments
  const allDepartments = Array.isArray(departmentsProp) ? departmentsProp : [];
  // Removed all logging and Firestore subscription for production readiness.

  // Add CEODesk for employees only
  // if (!isCEO()) {
  //   allDepartments.unshift({ id: 'ceodesk', name: 'CEODesk' });
  // }

  return (
    <Sheet
      sx={{
        // Responsive sidebar: full width on xs, fixed width on sm+
        width: { xs: '100%', sm: '70px' },
        height: { xs: 'auto', sm: '100vh' },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: 'background.surface',
        // Border bottom on xs, border right on sm+
        borderBottom: { xs: '1px solid rgba(255, 255, 255, 0.1)', sm: 'none' },
        borderRight: { xs: 'none', sm: '1px solid rgba(255, 255, 255, 0.1)' },
        py: 2,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      
      <Box sx={{ mb: 3 }}>
        <Tooltip title="MyDesk" placement="right" variant="soft">
          <Button
            variant="solid"
            color="primary"
            onClick={onGoHome}
            sx={{
              fontWeight: 'bold',
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              p: 0,
              fontSize: '16px'
            }}
          >
            MD
          </Button>
        </Tooltip>
      </Box>
      
      {/* Add Department Button */}
      <ListItem sx={{ width: 'auto', mb: 2 }}>
        <Tooltip title="Add Department" placement="right" variant="soft">
          <ListItemButton
            onClick={handleOpenModal}
            sx={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              p: 0,
              bgcolor: 'primary.500',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.600',
              },
            }}
          >
            +
          </ListItemButton>
        </Tooltip>
      </ListItem>
      
      {/* Add Department Modal */}
      <Modal open={openModal} onClose={handleCloseModal}>
        <ModalDialog
          sx={{
            maxWidth: 400,
            borderRadius: 'md',
            p: 3,
            boxShadow: 'lg',
          }}
        >
          <Typography level="h4" component="h2" sx={{ mb: 2 }}>
            Create New Department
          </Typography>
          <form onSubmit={handleCreateDepartment}>
            <Input
              autoFocus
              placeholder="Department Name"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              sx={{ mb: 2, width: '100%', color: 'text.primary' }}
            />
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button variant="plain" color="neutral" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newDeptName.trim()}>
                Create
              </Button>
            </Box>
          </form>
        </ModalDialog>
      </Modal>

      <List
        sx={{
          '--ListItem-radius': '50%',
          '--List-gap': '12px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {allDepartments.map((dept) => (
          <ListItem key={dept.id} sx={{ width: 'auto' }}>
            <Tooltip
              title={dept.name}
              placement="right"
              variant="soft"
            >
              <ListItemButton
                selected={selectedDepartment?.id === dept.id}
                onClick={() => onSelectDepartment(dept)}
                sx={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  p: 0,
                  bgcolor: selectedDepartment?.id === dept.id ? 'primary.500' : 'background.level2',
                  color: selectedDepartment?.id === dept.id ? '#111' : 'text.primary',
                  fontWeight: selectedDepartment?.id === dept.id ? 'bold' : 'normal',
                  '&:hover': {
                    bgcolor: selectedDepartment?.id === dept.id ? 'primary.600' : 'background.level3',
                  },
                }}
              >
                {dept.name.charAt(0).toUpperCase()}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>

      <Box sx={{ mt: 'auto' }}>
        <ListItem sx={{ width: 'auto' }}>
          {/* <Tooltip title="Settings" placement="right" variant="soft">
            <ListItemButton
              sx={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                p: 0,
                bgcolor: 'background.level2',
                '&:hover': {
                  bgcolor: 'background.level3',
                },
              }}
            >
              ⚙️
            </ListItemButton>
          </Tooltip> */}
          <UserProfile />
        </ListItem>
      </Box>
    </Sheet>
  );
};

export default DepartmentSidebar;
