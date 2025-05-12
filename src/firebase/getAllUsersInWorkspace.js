// Get all users in a workspace by querying Users collection for joined_workspace containing the workspaceId
import { db } from './config';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

/**
 * Returns a list of user profiles who are members of the given workspace.
 * @param {string} workspaceId
 * @returns {Promise<Array<{uid: string, firstname: string, lastname: string, email: string, UsersTitle: string}>>}
 */
export const getAllUsersInWorkspace = async (workspaceId) => {
  const usersRef = collection(db, 'Users');
  const usersSnap = await getDocs(usersRef);
  const members = [];
  for (const docSnap of usersSnap.docs) {
    const user = docSnap.data();
    const wsRef = doc(db, 'Users', user.uid, 'joined_workspace', workspaceId);
    const wsSnap = await getDoc(wsRef);
    if (wsSnap.exists()) {
      const wsData = wsSnap.data();
      members.push({
        uid: user.uid,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        UsersTitle: wsData.UsersTitle || 'Employee'
      });
    }
  }
  return members;
};
