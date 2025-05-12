import { collection, getDocs } from 'firebase/firestore';
import { db } from './config';

/**
 * Returns the number of members in the Team collection for a workspace.
 * @param {string} workspaceId
 * @returns {Promise<number>} Team member count (excluding CEO)
 */
export async function getTeamMemberCount(workspaceId) {
  if (!workspaceId) return 0;
  const teamCol = collection(db, 'Workspaces', workspaceId, 'Team');
  const snapshot = await getDocs(teamCol);
  return snapshot.size;
}
