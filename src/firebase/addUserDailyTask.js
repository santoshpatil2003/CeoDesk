import { db } from './config';
import { doc, setDoc, getDoc } from 'firebase/firestore';

/**
 * Add a daily task for a user in a workspace with department info.
 * Firestore path: /Users/{uid}/joined_workspace/{workspaceId}/Daily Task/{dateKey}
 * @param {string} uid - User ID
 * @param {string} workspaceId - Workspace ID
 * @param {string} departmentId - Department ID
 * @param {object} taskData - Task object (should include at least text, finishDate, etc)
 * @returns {Promise<boolean>}
 */
export const addUserDailyTask = async (uid, workspaceId, departmentId, taskData) => {
  try {
    if (!uid || !workspaceId || !taskData) throw new Error('Missing required arguments');
    // Use dateKey as the document ID, and store an array of tasks for that date
    const now = new Date();
    const dateKey = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const taskDocRef = doc(db, 'Users', uid, 'joined_workspace', workspaceId, 'Daily Task', dateKey);
    let tasks = [];
    const taskSnap = await getDoc(taskDocRef);
    if (taskSnap.exists()) {
      tasks = taskSnap.data().tasks || [];
    }
    tasks.push({ ...taskData, departmentId });
    await setDoc(taskDocRef, { tasks }, { merge: true });
    return true;
  } catch (error) {
    throw error;
  }
};

// Update completion status of a user's daily task
export const updateUserDailyTaskCompletion = async (uid, workspaceId, departmentId, dateKey, taskId, completed) => {
  try {
    const taskDocRef = doc(db, 'Users', uid, 'joined_workspace', workspaceId, 'Daily Task', dateKey);
    const taskSnap = await getDoc(taskDocRef);
    if (!taskSnap.exists()) return false;
    let tasks = taskSnap.data().tasks || [];
    tasks = tasks.map(task => (String(task.id) === String(taskId) ? { ...task, completed } : task));
    await setDoc(taskDocRef, { tasks }, { merge: true });
    return true;
  } catch (error) {
    console.error('updateUserDailyTaskCompletion error:', error);
    throw error;
  }
};
