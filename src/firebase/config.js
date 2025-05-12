import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, query, where, orderBy, limit, serverTimestamp, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCgmeH-qVOWAzuFmVk-G624HV5zPJvRmVU",
    authDomain: "licentra.firebaseapp.com",
    projectId: "licentra",
    storageBucket: "licentra.appspot.com",
    messagingSenderId: "1013334045085",
    appId: "1:1013334045085:web:64d13310d04a0e9366bf74",
    measurementId: "G-P4P70MLCCW"
};
  

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Timestamp utility
const timestamp = serverTimestamp;

// User management functions
const createUser = async (userData) => {
  try {
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      userData.email,
      userData.password
    );

    // Update user profile
    await updateProfile(userCredential.user, {
      displayName: `${userData.firstname} ${userData.lastname}`
    });

    // Add user to Firestore
    await setDoc(doc(db, 'Users', userCredential.user.uid), {
      uid: userCredential.user.uid,
      firstname: userData.firstname,
      lastname: userData.lastname,
      email: userData.email,
      time: timestamp(),
      joined_workspace: {}
    });

    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

const signInUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

const signOutUser = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    throw error;
  }
};

const resetUserPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    throw error;
  }
};

// Workspace management functions
const createWorkspace = async (workspaceData, userId) => {
  try {
    const workspaceId = Date.now().toString();
    // Create workspace document
    await setDoc(doc(db, 'Workspaces', workspaceId), {
      id: workspaceId,
      companyName: workspaceData.companyName,
      companyDescription: workspaceData.companyDescription,
      industry: workspaceData.industry,
      companySize: workspaceData.companySize,
      time: timestamp(),
      createdByUid: userId,
      CeoUid: userId,
      myDesk: { godsEye: {}, files: {} }
    });
    // Add joined_workspace doc for creator
    const wsDoc = {
      id: workspaceId,
      companyName: workspaceData.companyName,
      companyDescription: workspaceData.companyDescription,
      lastAccessedDate: timestamp(),
      companySize: workspaceData.companySize,
      UsersTitle: 'CEO',
    };
    const wsRef = doc(db, 'Users', userId, 'joined_workspace', workspaceId);
    await setDoc(wsRef, wsDoc, { merge: true });
    return workspaceId;
  } catch (error) {
    throw error;
  }
};

const getUserWorkspaces = async (userId) => {
  try {
    const wsColRef = collection(db, 'Users', userId, 'joined_workspace');
    const wsSnap = await getDocs(wsColRef);
    const workspaces = {};
    wsSnap.forEach(docSnap => {
      workspaces[docSnap.id] = docSnap.data();
    });
    return workspaces;
  } catch (error) {
    throw error;
  }
};

const getWorkspaceDetails = async (workspaceId) => {
  try {
    const workspaceRef = doc(db, 'Workspaces', workspaceId);
    const workspaceSnap = await getDoc(workspaceRef);
    
    if (workspaceSnap.exists()) {
      return workspaceSnap.data();
    }
    
    throw new Error('Workspace not found');
  } catch (error) {
    throw error;
  }
};

// Department management functions
const createDepartment = async (workspaceId, departmentData) => {
  try {
    const departmentId = Date.now().toString();
    const departmentRef = doc(collection(doc(db, 'Workspaces', workspaceId), 'department'), departmentId);
    await setDoc(departmentRef, {
      id: departmentId,
      name: departmentData.name,
      time: timestamp(),
      createdByUid: departmentData.createdByUid,
    });
    // Create empty subcollections: chat, files, dailyTasks (Firestore creates subcollections on first write)
    // Optionally, you can add a dummy doc to each subcollection, or leave empty for now
    return departmentId;
  } catch (error) {
    throw error;
  }
};

const deleteDepartment = async (workspaceId, departmentId) => {
  try {
    const deptRef = doc(db, 'Workspaces', workspaceId, 'department', departmentId);
    await deleteDoc(deptRef);
    return true;
  } catch (error) {
    throw error;
  }
};

const getDepartments = async (workspaceId) => {
  try {
    const departmentsCol = collection(doc(db, 'Workspaces', workspaceId), 'department');
    const departmentsSnap = await getDocs(departmentsCol);
    const departments = [];
    departmentsSnap.forEach((docSnap) => {
      departments.push(docSnap.data());
    });
    return departments;
  } catch (error) {
    throw error;
  }
};

// Chat management functions
const addChatMessage = async (workspaceId, departmentId, dateKey, message) => {
  try {
    // Each dateKey is now a document in the 'chat' subcollection
    const chatDocRef = doc(db, 'Workspaces', workspaceId, 'department', departmentId, 'chat', dateKey);
    const chatSnap = await getDoc(chatDocRef);
    let messages = [];
    if (chatSnap.exists()) {
      messages = chatSnap.data().messages || [];
    }
    messages.push({
      message_by: message.message_by,
      message_by_uid: message.message_by_uid,
      message: message.message,
      title: message.title,
      timestamp: message.timestamp || new Date().toISOString()
    });
    await setDoc(chatDocRef, { messages }, { merge: true });
    return true;
  } catch (error) {
    throw error;
  }
};

const getChatMessages = async (workspaceId, departmentId) => {
  try {
    // Get all chat documents (each date is a document)
    const chatColRef = collection(db, 'Workspaces', workspaceId, 'department', departmentId, 'chat');
    const chatSnap = await getDocs(chatColRef);
    const chatData = {};
    chatSnap.forEach(docSnap => {
      chatData[docSnap.id] = docSnap.data().messages || [];
    });
    return chatData; // { dateKey: [messages] }
  } catch (error) {
    throw error;
  }
};

const getFiles = async (workspaceId, departmentId) => {
  try {
    const filesColRef = collection(db, 'Workspaces', workspaceId, 'department', departmentId, 'files');
    const filesSnap = await getDocs(filesColRef);
    const filesData = {};
    filesSnap.forEach(docSnap => {
      filesData[docSnap.id] = docSnap.data();
    });
    return filesData;
  } catch (error) {
    throw error;
  }
};

// Task management functions
// Daily Task management functions
const addDailyTask = async (workspaceId, departmentId, dateKey, taskData) => {
  try {
    // Each dateKey is a document in the 'dailyTask' subcollection
    const taskDocRef = doc(db, 'Workspaces', workspaceId, 'department', departmentId, 'dailyTask', dateKey);
    const taskSnap = await getDoc(taskDocRef);
    let tasks = [];
    if (taskSnap.exists()) {
      tasks = taskSnap.data().tasks || [];
    }
    tasks.push(taskData);
    await setDoc(taskDocRef, { tasks }, { merge: true });
    return true;
  } catch (error) {
    throw error;
  }
};

// Delete a daily task by id
const deleteDailyTask = async (workspaceId, departmentId, dateKey, taskId) => {
  try {
    const taskDocRef = doc(db, 'Workspaces', workspaceId, 'department', departmentId, 'dailyTask', dateKey);
    const taskSnap = await getDoc(taskDocRef);
    if (!taskSnap.exists()) return false;
    let tasks = taskSnap.data().tasks || [];
    tasks = tasks.filter(task => String(task.id) !== String(taskId));
    await setDoc(taskDocRef, { tasks }, { merge: true });
    return true;
  } catch (error) {
    console.error('deleteDailyTask error:', error);
    throw error;
  }
};

// Update completion status of a task by id
const updateDailyTaskCompletion = async (workspaceId, departmentId, dateKey, taskId, completed) => {
  try {
    const taskDocRef = doc(db, 'Workspaces', workspaceId, 'department', departmentId, 'dailyTask', dateKey);
    const taskSnap = await getDoc(taskDocRef);
    if (!taskSnap.exists()) return false;
    let tasks = taskSnap.data().tasks || [];
    tasks = tasks.map(task => {
      return String(task.id) === String(taskId) ? { ...task, completed } : task;
    });
    await setDoc(taskDocRef, { tasks }, { merge: true });
    return true;
  } catch (error) {
    console.error('updateDailyTaskCompletion error:', error);
    throw error;
  }
};

// Get all daily tasks grouped by dateKey
const getDailyTasks = async (workspaceId, departmentId) => {
  try {
    const dailyTaskColRef = collection(db, 'Workspaces', workspaceId, 'department', departmentId, 'dailyTask');
    const dailyTaskSnap = await getDocs(dailyTaskColRef);
    const tasksData = {};
    dailyTaskSnap.forEach(docSnap => {
      tasksData[docSnap.id] = docSnap.data().tasks || [];
    });
    return tasksData; // { dateKey: [tasks] }
  } catch (error) {
    throw error;
  }
};



// GodsEye (CEO conversation data) management
const addGodsEyeConversation = async (workspaceId, conversationData) => {
  try {
    const conversationId = Date.now().toString();
    const workspaceRef = doc(db, 'Workspaces', workspaceId);
    const workspaceSnap = await getDoc(workspaceRef);
    
    if (workspaceSnap.exists()) {
      const workspaceData = workspaceSnap.data();
      const myDesk = workspaceData.myDesk || {};
      const godsEye = myDesk.godsEye || {};
      
      godsEye[conversationId] = {
        id: conversationId,
        title: conversationData.title,
        messages: conversationData.messages || [],
        time: timestamp()
      };
      
      await updateDoc(workspaceRef, {
        [`myDesk.godsEye.${conversationId}`]: godsEye[conversationId]
      });
      
      return conversationId;
    }
    
    throw new Error('Workspace not found');
  } catch (error) {
    throw error;
  }
};

const getGodsEyeConversations = async (workspaceId) => {
  try {
    const workspaceRef = doc(db, 'Workspaces', workspaceId);
    const workspaceSnap = await getDoc(workspaceRef);
    
    if (workspaceSnap.exists()) {
      const workspaceData = workspaceSnap.data();
      const myDesk = workspaceData.myDesk || {};
      return myDesk.godsEye || {};
    }
    
    throw new Error('Workspace not found');
  } catch (error) {
    throw error;
  }
};

// Godseye chat management functions
const addGodsEyeChatMessage = async (workspaceId, uid, dateKey, message) => {
  try {
    const chatDocRef = doc(db, 'Workspaces', workspaceId, 'GodsEye', uid, 'chat', dateKey);
    const chatSnap = await getDoc(chatDocRef);
    let messages = [];
    if (chatSnap.exists()) {
      messages = chatSnap.data().messages || [];
    }
    messages.push(message);
    await setDoc(chatDocRef, { messages }, { merge: true });
    return true;
  } catch (error) {
    throw error;
  }
};

const getGodsEyeChatMessages = async (workspaceId, uid) => {
  try {
    const chatColRef = collection(db, 'Workspaces', workspaceId, 'GodsEye', uid, 'chat');
    const chatSnap = await getDocs(chatColRef);
    const chatData = {};
    chatSnap.forEach(docSnap => {
      chatData[docSnap.id] = docSnap.data().messages || [];
    });
    return chatData;
  } catch (error) {
    throw error;
  }
};

// Team management functions
const inviteUserToWorkspace = async (workspaceId, userEmail, userTitle) => {
  try {
    // In a real app, you would send an email invitation
    // For now, we'll just create a placeholder in the workspace
    const invitationId = Date.now().toString();
    const workspaceRef = doc(db, 'Workspaces', workspaceId);
    
    // Create invitations collection if it doesn't exist
    await updateDoc(workspaceRef, {
      [`invitations.${invitationId}`]: {
        id: invitationId,
        email: userEmail,
        title: userTitle,
        status: 'pending',
        time: timestamp()
      }
    });
    
    return invitationId;
  } catch (error) {
    throw error;
  }
};

const joinWorkspace = async (userId, workspaceId, userTitle = 'Employee') => {
  try {
    // Get workspace details
    const workspaceRef = doc(db, 'Workspaces', workspaceId);
    const workspaceSnap = await getDoc(workspaceRef);
    if (!workspaceSnap.exists()) throw new Error('Workspace not found');
    const workspaceData = workspaceSnap.data();
    // Set joined_workspace as a subcollection document
    const wsDoc = {
      id: workspaceId,
      companyName: workspaceData.companyName,
      companyDescription: workspaceData.companyDescription,
      lastAccessed: timestamp(),
      companySize: workspaceData.companySize,
      UsersTitle: userTitle,
    };
    const wsRef = doc(db, 'Users', userId, 'joined_workspace', workspaceId);
    await setDoc(wsRef, wsDoc, { merge: true });
    return true;
  } catch (error) {
    throw error;
  }
};

// Storage functions for file uploads
const uploadFileToStorage = async (file, path) => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    throw error;
  }
};

const deleteFileFromStorage = async (path) => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    throw error;
  }
};

// Real-time listeners
const subscribeToWorkspace = (workspaceId, callback) => {
  const departmentsCol = collection(doc(db, 'Workspaces', workspaceId), 'department');
  return onSnapshot(departmentsCol, (snapshot) => {
    const departments = [];
    snapshot.forEach((docSnap) => {
      departments.push({ id: docSnap.id, ...docSnap.data() });
    });
    callback({ Departments: departments });
  });
};

const subscribeToDepartmentChat = (workspaceId, departmentId, callback) => {
  // Listen to all chat documents (each date is a doc in the 'chat' subcollection)
  const chatColRef = collection(db, 'Workspaces', workspaceId, 'department', departmentId, 'chat');
  return onSnapshot(chatColRef, (snapshot) => {
    const chatData = {};
    snapshot.forEach(docSnap => {
      chatData[docSnap.id] = docSnap.data().messages || [];
    });
    callback(chatData); // { dateKey: [messages] }
  });
};

const subscribeToUserWorkspaces = (userId, callback) => {
  const wsColRef = collection(db, 'Users', userId, 'joined_workspace');
  return onSnapshot(wsColRef, (snapshot) => {
    const workspaces = {};
    snapshot.forEach(docSnap => {
      workspaces[docSnap.id] = docSnap.data();
    });
    callback(workspaces);
  });
};

// Auth state listener
const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

export {
  db,
  auth,
  storage,
  timestamp,
  createUser,
  signInUser,
  signOutUser,
  resetUserPassword,
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceDetails,
  createDepartment,
  deleteDepartment,
  getDepartments,
  addChatMessage,
  getChatMessages,
  getFiles,
  addDailyTask,
  getDailyTasks,
  updateDailyTaskCompletion,
  deleteDailyTask,
  addGodsEyeConversation,
  getGodsEyeConversations,
  addGodsEyeChatMessage,
  getGodsEyeChatMessages,
  inviteUserToWorkspace,
  joinWorkspace,
  uploadFileToStorage,
  deleteFileFromStorage,
  subscribeToWorkspace,
  subscribeToDepartmentChat,
  subscribeToUserWorkspaces,
  subscribeToAuthChanges
};
