// import React, { useEffect, useState } from 'react';
// import { Box, Typography, IconButton, Stack, Select, Option, CircularProgress, Tooltip } from '@mui/joy';
// import DeleteIcon from '@mui/icons-material/Delete';
// import EditIcon from '@mui/icons-material/Edit';
// import SaveIcon from '@mui/icons-material/Save';
// import CancelIcon from '@mui/icons-material/Close';
// import { useAuth } from '../contexts/AuthContext';

// // Firestore helpers (to be implemented if not present)
// import { getTeamMembers, removeTeammateFromTeam, updateTeammateJobTitle } from '../firebase/teamManagement';

// const TeamManagementPanel = () => {
//   const { currentWorkspace, currentUser } = useAuth();
//   const [team, setTeam] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [editId, setEditId] = useState(null);
//   const [editTitle, setEditTitle] = useState('');
//   const [saving, setSaving] = useState(false);

//   useEffect(() => {
//     if (!currentWorkspace?.id) return;
//     setLoading(true);
//     getTeamMembers(currentWorkspace.id)
//       .then(setTeam)
//       .finally(() => setLoading(false));
//   }, [currentWorkspace]);

//   const handleRemove = async (uid) => {
//     setSaving(true);
//     await removeTeammateFromTeam(currentWorkspace.id, uid);
//     setTeam(team.filter(member => member.uid !== uid));
//     setSaving(false);
//   };

//   const handleEdit = (uid, title) => {
//     setEditId(uid);
//     setEditTitle(title);
//   };

//   const handleSave = async (uid) => {
//     setSaving(true);
//     await updateTeammateJobTitle(currentWorkspace.id, uid, editTitle);
//     setTeam(team.map(member => member.uid === uid ? { ...member, jobTitle: editTitle } : member));
//     setEditId(null);
//     setSaving(false);
//   };

//   const handleCancel = () => {
//     setEditId(null);
//     setEditTitle('');
//   };

//   if (loading) {
//     return (
//       <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
//         <CircularProgress />
//       </Box>
//     );
//   }

//   return (
//     <Box sx={{ p: 2 }}>
//       <Typography level="h4" sx={{ mb: 2 }}>Team Management</Typography>
//       <Stack spacing={2}>
//         {team.map(member => (
//           <Box key={member.uid} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, borderRadius: 1, bgcolor: 'background.level1' }}>
//             <Box sx={{ flex: 1 }}>
//               <Typography level="title-md">{member.name} {member.uid === currentUser.uid && '(You)'}</Typography>
//               <Typography level="body-sm" sx={{ color: 'text.secondary' }}>{member.email}</Typography>
//             </Box>
//             {editId === member.uid ? (
//               <>
//                 <Select
//                   value={editTitle}
//                   onChange={(_, value) => setEditTitle(value)}
//                   sx={{ minWidth: 120 }}
//                 >
//                   <Option value="Developer">Developer</Option>
//                   <Option value="Designer">Designer</Option>
//                   <Option value="Marketing">Marketing</Option>
//                   <Option value="Sales">Sales</Option>
//                   <Option value="HR">HR</Option>
//                   <Option value="Finance">Finance</Option>
//                   <Option value="Operations">Operations</Option>
//                   <Option value="Executive">Executive</Option>
//                   <Option value="Other">Other</Option>
//                 </Select>
//                 <Tooltip title="Save"><IconButton onClick={() => handleSave(member.uid)} disabled={saving}><SaveIcon /></IconButton></Tooltip>
//                 <Tooltip title="Cancel"><IconButton onClick={handleCancel} disabled={saving}><CancelIcon /></IconButton></Tooltip>
//               </>
//             ) : (
//               <>
//                 <Typography level="body-md" sx={{ minWidth: 120 }}>`Job Title: {member.jobTitle}`</Typography>
//                 {member.uid !== currentUser.uid && (
//                   <>
//                     <Tooltip title="Edit Job Title"><IconButton onClick={() => handleEdit(member.uid, member.jobTitle)} disabled={saving}><EditIcon /></IconButton></Tooltip>
//                     <Tooltip title="Remove"><IconButton color="danger" onClick={() => handleRemove(member.uid)} disabled={saving}><DeleteIcon /></IconButton></Tooltip>
//                   </>
//                 )}
//               </>
//             )}
//           </Box>
//         ))}
//       </Stack>
//     </Box>
//   );
// };

// export default TeamManagementPanel;
