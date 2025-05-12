import React from 'react';
import { Box } from '@mui/joy';
import Chat from '../components/Chat';
import FileShare from '../components/FileShare';
import DailyTasks from '../components/DailyTasks';
import { useAuth } from '../contexts/AuthContext';

const Department = ({ department, selectedTab }) => {
  const { currentWorkspace, currentUser } = useAuth(); // <-- get currentUser
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          bgcolor: 'background.surface',
          overflow: 'hidden'
        }}
      >
        {/* Content Area */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {selectedTab === 0 && <Chat department={department} workspaceId={currentWorkspace.id} />}
          {selectedTab === 1 && (
            <FileShare department={department} workspaceId={currentWorkspace.id} currentUser={currentUser} />
          )}
          {selectedTab === 2 && <DailyTasks department={department} workspaceId={currentWorkspace.id} />}
        </Box>
      </Box>
    </Box>
  );
};

export default Department;
