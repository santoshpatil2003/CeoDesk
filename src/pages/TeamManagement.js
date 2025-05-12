import React, { useEffect, useState } from 'react';
import { Box, Typography, IconButton, Stack, Select, Option, CircularProgress, Tooltip, Sheet, Avatar } from '@mui/joy';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Close';
import { useAuth } from '../contexts/AuthContext';
import { getTeamMembers, removeTeammateFromTeam, updateTeammateJobTitle } from '../firebase/teamManagement';

const TeamManagement = () => {
  const { currentWorkspace, currentUser } = useAuth();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    setLoading(true);
    getTeamMembers(currentWorkspace.id)
      .then(setTeam)
      .finally(() => setLoading(false));
  }, [currentWorkspace]);

  const handleRemove = async (uid) => {
    setSaving(true);
    await removeTeammateFromTeam(currentWorkspace.id, uid);
    setTeam(team.filter(member => member.uid !== uid));
    setSaving(false);
  };

  const handleEdit = (uid, title) => {
    setEditId(uid);
    setEditTitle(title);
  };

  const handleSave = async (uid) => {
    setSaving(true);
    await updateTeammateJobTitle(currentWorkspace.id, uid, editTitle);
    setTeam(team.map(member => member.uid === uid ? { ...member, jobTitle: editTitle } : member));
    setEditId(null);
    setSaving(false);
  };

  const handleCancel = () => {
    setEditId(null);
    setEditTitle('');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  // console.log(team.length);
  if(team.length === 0){
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography level="body-md" sx={{ color: 'text.secondary' }}>No team members found.</Typography>
      </Box>
    );
  }
  return (
    <Sheet sx={{ maxWidth: '100%', mx: 'auto', mt: 4, p: 3, borderRadius: 'md', bgcolor: 'transparent', boxShadow: 'lg' }}>
      <Typography level="h3" sx={{ mb: 3, textAlign: 'center' }}>Team Management</Typography>
      <Stack spacing={2} sx={{width: '100%'}}>
        {team.map(member => (
          <Box key={member.uid} sx={{ display: 'flex', border: '1px solid rgb(255,255,255,0.2)', alignItems: 'center', gap: 2, p: 2, borderRadius: '5px', boxShadow: 'sm' }}>
            <Avatar>{member.name ? member.name[0] : '?'}</Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography level="title-md">{member.name} {member.uid === currentUser.uid && '(You)'}</Typography>
              <Typography level="body-sm" sx={{ color: 'text.secondary' }}>{member.email}</Typography>
            </Box>
            {editId === member.uid ? (
              <>
                <Select
                  value={editTitle}
                  onChange={(_, value) => setEditTitle(value)}
                  sx={{ minWidth: 120, color: 'text.primary' }}
                >
                  <Option value="Developer" sx={{ color: 'text.primary' }}>Developer</Option>
                  <Option value="Designer" sx={{ color: 'text.primary' }}>Designer</Option>
                  <Option value="Marketing" sx={{ color: 'text.primary' }}>Marketing</Option>
                  <Option value="Sales" sx={{ color: 'text.primary' }}>Sales</Option>
                  <Option value="HR" sx={{ color: 'text.primary' }}>HR</Option>
                  <Option value="Finance" sx={{ color: 'text.primary' }}>Finance</Option>
                  <Option value="Operations" sx={{ color: 'text.primary' }}>Operations</Option>
                  <Option value="Executive" sx={{ color: 'text.primary' }}>Executive</Option>
                  <Option value="Other" sx={{ color: 'text.primary' }}>Other</Option>
                </Select>
                <Tooltip title="Save"><IconButton onClick={() => handleSave(member.uid)} disabled={saving}><SaveIcon /></IconButton></Tooltip>
                <Tooltip title="Cancel"><IconButton onClick={handleCancel} disabled={saving}><CancelIcon /></IconButton></Tooltip>
              </>
            ) : (
              <>
                <Typography level="body-md" sx={{ minWidth: 120 }}>{member.jobTitle}</Typography>
                {member.uid !== currentUser.uid && (
                  <>
                    <Tooltip title="Edit Job Title"><IconButton onClick={() => handleEdit(member.uid, member.jobTitle)} disabled={saving}><EditIcon /></IconButton></Tooltip>
                    <Tooltip title="Remove"><IconButton color="danger" onClick={() => handleRemove(member.uid)} disabled={saving}><DeleteIcon /></IconButton></Tooltip>
                  </>
                )}
              </>
            )}
          </Box>
        ))}
      </Stack>
    </Sheet>
  );
};

export default TeamManagement;
