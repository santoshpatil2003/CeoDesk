import { collection, getDocs, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Returns a map of departmentId to departmentName for a workspace.
 * @param {string} workspaceId
 * @returns {Promise<Object>} departmentId -> departmentName
 */
export async function getDepartmentIdNameMap(workspaceId) {
  const map = {};
  if (!workspaceId) return map;
  const departmentsCol = collection(doc(db, 'Workspaces', workspaceId), 'department');
  const departmentsSnap = await getDocs(departmentsCol);
  departmentsSnap.forEach(docSnap => {
    map[docSnap.id] = docSnap.data().name;
  });
  return map;
}
