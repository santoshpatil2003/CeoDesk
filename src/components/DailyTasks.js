import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Input, Typography, Sheet, IconButton, Checkbox, Divider, Card, CircularProgress } from '@mui/joy';
import { addDailyTask, getDailyTasks, updateDailyTaskCompletion, deleteDailyTask } from '../firebase/config';
import { addUserDailyTask, updateUserDailyTaskCompletion } from '../firebase/addUserDailyTask';
import { db } from '../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import TaskUserProfile from './TaskUserProfile';
import { getAllUsersInWorkspace } from '../firebase/getAllUsersInWorkspace';
import { getUserByName } from '../utils/userUtils';
import FinishDateModal from './FinishDateModal';

const DailyTasks = ({ department, workspaceId }) => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [members, setMembers] = useState([]);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [pendingTaskText, setPendingTaskText] = useState('');
  const [tasksLoading, setTasksLoading] = useState(true);
  const { currentUser } = useAuth();

  // Fetch workspace members for user profile display
  useEffect(() => {
    if (!workspaceId) return;
    getAllUsersInWorkspace(workspaceId).then(setMembers).catch(() => setMembers([]));
  }, [workspaceId]);

  // Show modal for finish date on Add
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTask.trim() || !currentUser || !workspaceId || !department?.id) return;
    setPendingTaskText(newTask);
    setFinishModalOpen(true);
  };
  console.log(department.id);
  // Actually submit the task after finish date is picked
  const handleFinishDateSubmit = async (finishDate) => {
    setLoading(true);
    setFinishModalOpen(false);
    const now = new Date();
    const dateKey = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const taskObj = {
      id: Date.now(),
      text: pendingTaskText,
      departmentId: department.id,
      completed: false,
      timestamp: now.toISOString(),
      user: currentUser.name,
      uid: currentUser.uid, // store UID of creator
      title: currentUser.role || 'Member',
      finishDate: finishDate, // ISO string from modal
    };
    try {
      await addDailyTask(workspaceId, department.id, dateKey, taskObj);
      await addUserDailyTask(currentUser.uid, workspaceId, department.id, taskObj);
      // Only fetch tasks after both succeed
      setNewTask('');
      setPendingTaskText('');
    } catch (err) {
      // Optionally handle error
    } finally {
      setLoading(false);
    }
  };


  const handleDeleteTask = async (taskId, dateKey) => {
    if (!workspaceId || !department?.id || !dateKey) return;
    setDeletingTaskId(taskId);
    try {
      await deleteDailyTask(workspaceId, department.id, dateKey, taskId);
      fetchTasks();
    } catch (err) {
      alert('Failed to delete task.');
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handleToggleComplete = async (taskId, dateKey, currentCompleted) => {
  try {
    console.log('Toggling complete:', { taskId, dateKey, currentCompleted });
    // Update in workspace and user collections
    await updateDailyTaskCompletion(workspaceId, department.id, dateKey, taskId, !currentCompleted);
    await updateUserDailyTaskCompletion(currentUser.uid, workspaceId, department.id, dateKey, taskId, !currentCompleted);
    fetchTasks();
  } catch (err) {
    console.error('Failed to toggle completion:', err);
    alert('Failed to update task completion. See console for details.');
  }
};

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const realTasks = tasks.filter(task => !task.isDateDivider);
  const completedTasks = realTasks.filter(task => task.completed).length;
  const totalTasks = realTasks.length;
  const progress = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;

  // Fetch tasks function for reuse
  const fetchTasks = useCallback(async () => {
    if (!workspaceId || !department?.id) return;
    setTasksLoading(true);
    try {
      const tasksData = await getDailyTasks(workspaceId, department.id);
      const sortedDates = Object.keys(tasksData || {}).sort((a, b) => new Date(b) - new Date(a));
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
    } catch (err) {
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, [workspaceId, department, setTasks]);

  useEffect(() => {
    // Real-time updates for workspace daily tasks
    if (!workspaceId || !department?.id) return;
    setTasksLoading(true);
    const dailyTaskColRef = collection(db, 'Workspaces', workspaceId, 'department', department.id, 'dailyTask');
    const unsubscribe = onSnapshot(dailyTaskColRef, (dailyTaskSnap) => {
      const tasksData = {};
      dailyTaskSnap.forEach(docSnap => {
        tasksData[docSnap.id] = docSnap.data().tasks || [];
      });
      const sortedDates = Object.keys(tasksData || {}).sort((a, b) => new Date(b) - new Date(a));
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
  }, [workspaceId, department]);

  if (tasksLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.surface',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          bgcolor: 'background.surface',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mb: 1 }}>
          <Card
            variant="soft"
            color="primary"
            size="sm"
            sx={{
              p: 1,
              gap: 0.5,
              minWidth: 130,
              '--Card-padding': '4px 8px',
            }}
          >
            <Typography level="body3" sx={{ color: 'primary.500' }}>
              Progress
            </Typography>
            <Typography level="body1">
              {completedTasks}/{totalTasks} Tasks
            </Typography>
            <Box
              sx={{
                height: 6,
                borderRadius: 'full',
                bgcolor: 'background.level3',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  width: `${progress}%`,
                  bgcolor: 'primary.500',
                  transition: 'width 0.3s ease',
                }}
              />
            </Box>
          </Card>
        </Box>

        <Box
          component="form"
          onSubmit={handleAddTask}
          sx={{
            display: 'flex',
            gap: 1,
            mb: 2,
          }}
        >
          <Input
            fullWidth
            placeholder="Add a new task..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            sx={{
              '--Input-focusedThickness': '2px',
              '&:focus-within': {
                borderColor: 'primary.500',
              },
              color: 'text.primary',
              height: '40px',
            }}
          />
          <Button
            type="submit"
            sx={{
              bgcolor: 'primary.500',
              minWidth: 80,
              height: '40px',
              position: 'relative',
            }}
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size="sm" sx={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
            ) : (
              'Add'
            )}
          </Button>
        </Box>
        <FinishDateModal
          open={finishModalOpen}
          onClose={() => { setFinishModalOpen(false); setPendingTaskText(''); }}
          onSubmit={handleFinishDateSubmit}
        />
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
        }}
      >
        <>
          {(() => {
            const elements = [];
            let currentDate = null;
            let currentTasks = [];
            tasks.forEach((item, idx) => {
              if (item.isDateDivider) {
                // Render previous date's tasks in grid
                if (currentTasks.length > 0) {
                  elements.push(
                    <Box key={`grid-${currentDate}`} sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
                      {currentTasks}
                    </Box>
                  );
                  currentTasks = [];
                }
                // Render the date divider
                elements.push(
                  <Divider key={item.id} sx={{ my: 2, fontWeight: 600, color: 'text.tertiary' }}>
                    {item.date}
                  </Divider>
                );
                currentDate = item.date;
              } else {
                // Find user profile by UID
                const userProfile = members.find(m => m.uid === item.uid);
                currentTasks.push(
                  <Card
                    key={item.reactKey || item.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      bgcolor: item.completed ? 'background.level2' : 'background.surface',
                    }}
                  >
                    {/* User profile above task */}
                    <TaskUserProfile user={userProfile} size="sm" />
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        width: '100%',
                      }}
                    >
                      <Checkbox
                        checked={item.completed}
                        onChange={() => handleToggleComplete(item.id, item.dateKey, item.completed)}
                        sx={{ mr: 2 }}
                      />
                      <Box>
                        <Typography
                          level="body1"
                          sx={{
                            textDecoration: item.completed ? 'line-through' : 'none',
                            color: item.completed ? 'text.tertiary' : 'text.primary',
                            transition: 'color 0.2s ease',
                          }}
                        >
                          {item.text}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between',width: '100%'}}>
                      {/* Finish by date below task description, above delete button */}
                      {item.finishDate && (
                        <Typography
                          level="body3"
                          sx={{
                            color: 'primary.600',
                            mt: 1,
                            mb: 0.5,
                            fontWeight: 500,
                          }}
                        >
                          Finish by: {formatDate(item.finishDate)}
                        </Typography>
                      )}
                      <IconButton
                        variant="plain"
                        color="danger"
                        onClick={() => handleDeleteTask(item.id, item.dateKey)}
                        disabled={deletingTaskId === item.id}
                        sx={{
                          position: 'relative',
                          '--IconButton-size': '28px',
                          opacity: 0.5,
                          transition: 'opacity 0.2s ease',
                          mt: 1,
                          alignSelf: 'flex-end',
                        }}
                      >
                        {deletingTaskId === item.id ? (
                          <CircularProgress size="sm" sx={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
                        ) : (
                          '✕'
                        )}
                      </IconButton>
                    </Box>
                  </Card>
                );
              }
            });
            // Render last batch
            if (currentTasks.length > 0) {
              elements.push(
                <Box key={`grid-${currentDate || 'last'}`} sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
                  {currentTasks}
                </Box>
              );
            }
            return elements;
          })()}
        </>

        {tasks.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              p: 4,
              color: 'text.tertiary',
            }}
          >
            <Typography level="body1" sx={{ mb: 1 }}>
              No tasks yet
            </Typography>
            <Typography level="body2">
              Add a new task to get started
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default React.memo(DailyTasks);
