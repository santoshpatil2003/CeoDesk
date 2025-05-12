import { doc, setDoc } from 'firebase/firestore';
import { db } from './config';

/**
 * Adds a teammate to the Team collection for a workspace.
 * @param {string} workspaceId - The workspace's Firestore document ID.
 * @param {string} uid - The new teammate's UID (document ID in Team collection).
 * @param {Object} data - Teammate data (name, email, jobTitle, etc).
 */
export async function addTeammateToTeam(workspaceId, uid, data) {
  if (!workspaceId || !uid || !data) throw new Error('Missing required fields');
  const teamDocRef = doc(db, 'Workspaces', workspaceId, 'Team', uid);
  await setDoc(teamDocRef, data, { merge: true });
}
