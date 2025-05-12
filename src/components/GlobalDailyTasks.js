import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CircularProgress, Input, Button, Checkbox, IconButton, Divider } from '@mui/joy';
import { db } from '../firebase/config';
import TaskUserProfile from './TaskUserProfile';
import { getAllUsersInWorkspace } from '../firebase/getAllUsersInWorkspace';
import { collection, onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore';
import { updateDailyTaskCompletion } from '../firebase/config';
import { updateUserDailyTaskCompletion } from '../firebase/addUserDailyTask';
import { useAuth } from '../contexts/AuthContext';
import FinishDateModal from './FinishDateModal';
import { getDepartmentIdNameMap } from '../utils/departmentUtils';

const GlobalDailyTasks = ({workspaceId }) => {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [pendingTaskText, setPendingTaskText] = useState('');
  const [userMap, setUserMap] = useState({});
  // Department ID -> Name map
  const [deptMap, setDeptMap] = useState({});

  // Fetch all users for this workspace (for user profile display)
  useEffect(() => {
    if (!workspaceId) return;
    getAllUsersInWorkspace(workspaceId).then(users => {
      const map = {};
      users.forEach(u => { map[u.uid] = u; });
      setUserMap(map);
    });
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    getDepartmentIdNameMap(workspaceId).then(setDeptMap).catch(() => setDeptMap({}));
  }, [workspaceId]);

  // Subscribe to user's global daily tasks
  useEffect(() => {
    if (!currentUser?.uid || !workspaceId) return;
    setTasksLoading(true);
    const dailyTaskColRef = collection(db, 'Users', currentUser.uid, 'joined_workspace', workspaceId, 'Daily Task');
    const unsubscribe = onSnapshot(dailyTaskColRef, (snap) => {
      const tasksData = {};
      snap.forEach(docSnap => {
        tasksData[docSnap.id] = docSnap.data().tasks || [];
      });
      // Flatten and sort by date (ascending - oldest first)
      const sortedDates = Object.keys(tasksData).sort((a, b) => new Date(a) - new Date(b));
      const allTasks = [];
      sortedDates.forEach(date => {
        const allDateTasks = tasksData[date] || [];
        if (allDateTasks.length > 0) {
          allTasks.push({ id: `date-${date}`, isDateDivider: true, date });
          allDateTasks.forEach(task => {
            allTasks.push({ ...task, id: task.id, dateKey: date, reactKey: `${date}-${task.id}` });
          });
        }
      });
      setTasks(allTasks);
      setTasksLoading(false);
    }, () => {
      setTasks([]);
      setTasksLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser, workspaceId]);

  // Add new task
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTask.trim() || !currentUser || !workspaceId) return;
    setPendingTaskText(newTask);
    setFinishModalOpen(true);
  };

  // console.log(department.id);

  // Actually submit the task after finish date is picked
  const handleFinishDateSubmit = async (finishDate) => {
    setLoading(true);
    setFinishModalOpen(false);
    const now = new Date();
    const dateKey = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const taskObj = {
      id: Date.now(),
      text: pendingTaskText,
      completed: false,
      departmentId: "personal",
      timestamp: now.toISOString(),
      user: currentUser.name,
      uid: currentUser.uid,
      title: currentUser.role || 'Member',
      finishDate,
    };
    try {
      const taskDocRef = doc(db, 'Users', currentUser.uid, 'joined_workspace', workspaceId, 'Daily Task', dateKey);
      let tasksArr = [];
      const taskSnap = await getDoc(taskDocRef);
      if (taskSnap.exists()) {
        tasksArr = taskSnap.data().tasks || [];
      }
      tasksArr.push(taskObj);
      await setDoc(taskDocRef, { tasks: tasksArr }, { merge: true });
      setNewTask('');
      setPendingTaskText('');
    } catch (err) {
      // Optionally handle error
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (taskId, dateKey, currentCompleted, departmentId) => {
    if (!currentUser?.uid || !workspaceId || !dateKey) return;
    try {
      // Update in department tasks
      await updateDailyTaskCompletion(workspaceId, departmentId, dateKey, taskId, !currentCompleted);
      // Update in user tasks
      await updateUserDailyTaskCompletion(currentUser.uid, workspaceId, departmentId, dateKey, taskId, !currentCompleted);
      // Reflect in local state
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !currentCompleted } : t));
    } catch (err) {
      console.error('Failed to toggle completion', err);
    }
  };

  const handleRemoveTask = async (taskId, dateKey) => {
    if (!currentUser?.uid || !workspaceId || !dateKey) return;
    try {
      const taskDocRef = doc(db, 'Users', currentUser.uid, 'joined_workspace', workspaceId, 'Daily Task', dateKey);
      const taskSnap = await getDoc(taskDocRef);
      if (!taskSnap.exists()) return;
      let tasksArr = taskSnap.data().tasks || [];
      tasksArr = tasksArr.filter(task => String(task.id) !== String(taskId));
      await setDoc(taskDocRef, { tasks: tasksArr }, { merge: true });
      // Update local state immediately
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  // DailyTasks-style progress metrics
  const realTasks = tasks.filter(task => !task.isDateDivider);
  const completedCount = realTasks.filter(task => task.completed).length;
  const totalCount = realTasks.length;
  const progress = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

  if (tasksLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.surface', overflow: 'hidden' }}>
      {/* DailyTasks-style header: progress, add form, finish modal */}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, bgcolor: 'background.surface' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mb: 1 }}>
          <Card variant="soft" color="primary" size="sm" sx={{ p: 1, gap: 0.5, minWidth: 130, '--Card-padding': '4px 8px' }}>
            <Typography level="body3" sx={{ color: 'primary.500' }}>Progress</Typography>
            <Typography level="body1">{completedCount}/{totalCount} Tasks</Typography>
            <Box sx={{ height: 6, borderRadius: 'full', bgcolor: 'background.level3', overflow: 'hidden' }}>
              <Box sx={{ height: '100%', width: `${progress}%`, bgcolor: 'primary.500', transition: 'width 0.3s ease' }} />
            </Box>
          </Card>
        </Box>
        <Box component="form" onSubmit={handleAddTask} sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Input fullWidth placeholder="Add a new global task..." value={newTask} onChange={e => setNewTask(e.target.value)} sx={{ '--Input-focusedThickness': '2px', '&:focus-within': { borderColor: 'primary.500' }, color: 'text.primary', height: '40px' }} disabled={loading} />
          <Button type="submit" sx={{ bgcolor: 'primary.500', minWidth: 80, height: '40px', position: 'relative' }} disabled={loading || !newTask.trim()}>
            {loading ? <CircularProgress size="sm" sx={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} /> : 'Add'}
          </Button>
        </Box>
        <FinishDateModal open={finishModalOpen} onClose={() => { setFinishModalOpen(false); setPendingTaskText(''); }} onSubmit={handleFinishDateSubmit} />
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {tasks.length === 0 && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'rgb(255,255,255,0.5)'}}><Typography level="body2">No private tasks is set.</Typography></Box>}
        {/* Group tasks by date with DailyTasks UI design */}
        {(() => {
          let currentDate = null;
          const elements = [];
          let batch = [];
          tasks.forEach(item => {
            if (item.isDateDivider) {
              if (batch.length) {
                elements.push(
                  <Box key={`grid-${currentDate}`} sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
                    {batch}
                  </Box>
                );
                batch = [];
              }
              elements.push(
                <Divider key={item.id} sx={{ my: 2, fontWeight: 600, color: 'text.tertiary' }}>
                  {item.date}
                </Divider>
              );
              currentDate = item.date;
            } else {
              const user = userMap[item.uid];
              batch.push(
                <Card key={item.reactKey} variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start', bgcolor: item.completed ? 'background.level2' : 'background.surface' }}>
                  {/* Display 'Personal' or department name */}
                  {item.departmentId === 'personal' ? (
                    <Typography level="body3" sx={{ mb:1, color:'text.primary', fontWeight:500 }}>
                      Personal
                    </Typography>
                  ) : (
                    <Typography level="body3" sx={{ mb:1, color:'text.primary', fontWeight:500 }}>
                      {deptMap[item.departmentId] || 'Loading...'}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                    <Checkbox
                      checked={item.completed}
                      onChange={() => handleToggleComplete(item.id, item.dateKey, item.completed, item.departmentId)}
                      sx={{ mr: 2 }}
                    />
                    <Box>
                      <Typography level="body1" sx={{ textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? 'text.tertiary' : 'text.primary', transition: 'color 0.2s ease' }}>
                        {item.text}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    {item.finishDate && (
                      <Typography level="body3" sx={{ color: 'primary.600', mt: 1, mb: 0.5, fontWeight: 500 }}>
                        Finish by: {new Date(item.finishDate).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    )}
                    <IconButton
                      variant="plain"
                      color="danger"
                      onClick={() => handleRemoveTask(item.id, item.dateKey)}
                      sx={{ position: 'relative', '--IconButton-size': '28px', opacity: 0.5, transition: 'opacity 0.2s ease', mt: 1, alignSelf: 'flex-end' }}
                    >
                      ×
                    </IconButton>
                  </Box>
                </Card>
              );
            }
          });
          if (batch.length) {
            elements.push(
              <Box key={`grid-${currentDate}`} sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
                {batch}
              </Box>
            );
          }
          return elements;
        })()}
      </Box>
    </Box>
  );
};

export default GlobalDailyTasks;
