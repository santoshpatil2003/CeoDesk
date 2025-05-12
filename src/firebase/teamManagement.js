import { getFirestore, collection, getDocs, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Fetch all team members for a workspace
export async function getTeamMembers(workspaceId) {
  var t = 0;
  const db = getFirestore();
  const teamRef = collection(db, 'Workspaces', workspaceId, 'Team');
  const snapshot = await getDocs(teamRef);
  
  return snapshot.docs.map(docSnap => ({id: t++, uid: docSnap.id, ...docSnap.data() }));
}

// Remove teammate from Team collection and update user profile
export async function removeTeammateFromTeam(workspaceId, uid) {
  const db = getFirestore();
  const teamDoc = doc(db, 'Workspaces', workspaceId, 'Team', uid);
  await deleteDoc(teamDoc);
  // Remove the membership document under Users/{uid}/joined_workspace/{workspaceId}
  const joinedDoc = doc(db, 'Users', uid, 'joined_workspace', workspaceId);
  await deleteDoc(joinedDoc);
  // Remove workspace from user's joined_workspace field
  const userDoc = doc(db, 'Users', uid);
  const userSnap = await getDoc(userDoc);
  if (userSnap.exists()) {
    const userData = userSnap.data();
    if (userData.joined_workspace && userData.joined_workspace[workspaceId]) {
      const updatedJoined = { ...userData.joined_workspace };
      delete updatedJoined[workspaceId];
      await updateDoc(userDoc, { joined_workspace: updatedJoined });
    }
  }
}

// Update teammate job title in Team collection and user profile
export async function updateTeammateJobTitle(workspaceId, uid, newTitle) {
  const db = getFirestore();
  const teamDoc = doc(db, 'Workspaces', workspaceId, 'Team', uid);
  await updateDoc(teamDoc, { jobTitle: newTitle });
  // Update UsersTitle in user's joined_workspace subcollection document
  const joinedWsDoc = doc(db, 'Users', uid, 'joined_workspace', workspaceId);
  await updateDoc(joinedWsDoc, { UsersTitle: newTitle });
}
