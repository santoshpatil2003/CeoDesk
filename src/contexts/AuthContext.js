import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  auth, 
  createUser, 
  signInUser, 
  signOutUser, 
  resetUserPassword, 
  subscribeToAuthChanges,
  getUserWorkspaces,
  joinWorkspace,
  getWorkspaceDetails
} from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Create the auth context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Provider component that wraps the app and makes auth object available to any child component that calls useAuth()
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState({});
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [error, setError] = useState('');

  // Listen for auth state changes when component mounts
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      setLoading(true);
      if (user) {
        try {
          // Get user profile from Firestore
          const userRef = doc(db, 'Users', user.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setUserProfile(userData);
            
            // Get user's workspaces
            const userWorkspaces = await getUserWorkspaces(user.uid);
            setWorkspaces(userWorkspaces);
            
            // Set currentUser, role will be updated by effect below
            const mergedUser = {
              ...user,
              uid: user.uid,
              email: user.email,
              name:
                (userData.firstname && userData.lastname)
                  ? `${userData.firstname} ${userData.lastname}`.trim()
                  : (userData.firstname || userData.lastname || user.email.split('@')[0]),
              firstname: userData.firstname,
              lastname: userData.lastname,
              role: 'Employee', // Default, will update below
              permissions: userData.permissions || []
            };
            setCurrentUser(mergedUser);
          } else {
            // User exists in Auth but not in Firestore
            setCurrentUser(user);
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
          setCurrentUser(user);
        }
      } else {
        // User is signed out
        setCurrentUser(null);
        setUserProfile(null);
        setWorkspaces({});
        setCurrentWorkspace(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Update currentUser.role (job title) when workspace or user profile changes
  useEffect(() => {
    if (!currentUser || !userProfile) return;
    let userRole = 'Employee';
    if (currentWorkspace && userProfile.joined_workspace?.[currentWorkspace.id]?.UsersTitle) {
      userRole = userProfile.joined_workspace[currentWorkspace.id].UsersTitle;
    } else if (workspaces && Object.values(workspaces).length > 0) {
      userRole = Object.values(workspaces)[0].UsersTitle || 'Employee';
    }
    if (currentUser.role !== userRole) {
      setCurrentUser({ ...currentUser, role: userRole });
    }
  }, [currentWorkspace, userProfile, workspaces]);

  // Sign in function
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      setError('');
      
      const user = await signInUser(email, password);
      
      // Get user profile
      const userRef = doc(db, 'Users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUserProfile(userData);
        
        // Get user's workspaces
        const userWorkspaces = await getUserWorkspaces(user.uid);
        setWorkspaces(userWorkspaces);
        
        return user;
      } else {
        throw new Error('User profile not found');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign up function
  const signUp = async (userData) => {
    try {
      setLoading(true);
      setError('');
      
      // Create user in Firebase Auth and Firestore
      const user = await createUser(userData);
      
      return user;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      await signOutUser();
      return true;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Reset password function
  const resetPassword = async (email) => {
    try {
      await resetUserPassword(email);
      return true;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Add workspace to user's joined_workspace (for invites)
  const addWorkspaceToUser = async (workspaceId, userIdOverride, userTitle = 'Employee') => {
    const uid = userIdOverride || (currentUser && currentUser.uid);
    if (!uid || !workspaceId) return;
    try {
      // Use joinWorkspace helper to add workspace with provided title/position
      await joinWorkspace(uid, workspaceId, userTitle);
      // Refresh user profile and workspaces
      const userRef = doc(db, 'Users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUserProfile(userSnap.data());
      }
      const userWorkspaces = await getUserWorkspaces(uid);
      setWorkspaces(userWorkspaces);
    } catch (err) {
      console.error('Failed to add workspace to user:', err);
      throw err;
    }
  };


  // Set current workspace
  const setActiveWorkspace = async (workspaceId) => {
    try {
      if (!workspaceId || !currentUser) return;
      
      // Get workspace details
      const workspaceDetails = await getWorkspaceDetails(workspaceId);
      setCurrentWorkspace(workspaceDetails);
      
      // Update last accessed date
      if (userProfile) {
        // If the current user is the creator or CEO of the workspace, always set UsersTitle to 'CEO'
        let userTitle = 'Employee';
        if (workspaceDetails && (workspaceDetails.CeoUid === currentUser.uid || workspaceDetails.createdByUid === currentUser.uid)) {
          userTitle = 'CEO';
        } else if (userProfile.joined_workspace[workspaceId]?.UsersTitle) {
          userTitle = userProfile.joined_workspace[workspaceId].UsersTitle;
        }
        await joinWorkspace(currentUser.uid, workspaceId, userTitle);
      }
      
      return workspaceDetails;
    } catch (error) {
      console.error('Error setting active workspace:', error);
      throw error;
    }
  };

  // Check if user has a specific permission
  const hasPermission = (permission) => {
    if (!currentUser || !currentUser.permissions) return false;
    return currentUser.permissions.includes(permission);
  };

  // Check if user is CEO/Admin
  const isCEO = () => {
    if (!currentUser) return false;
    
    // Check if user is CEO in current workspace
    if (currentWorkspace && currentWorkspace.CeoUid === currentUser.uid) {
      return true;
    }
    
    // Check user role
    const userRole = currentUser.role;
    return userRole === 'CEO' || userRole === 'Admin';
  };
  
  // Update user role to CEO/Admin
  const promoteToAdmin = async () => {
    if (!currentUser || !currentWorkspace) {
      throw new Error('No user logged in or no workspace selected');
    }
    
    try {
      // Update workspace CEO
      await joinWorkspace(currentUser.uid, currentWorkspace.id, 'CEO');
      
      // Refresh user data
      const userWorkspaces = await getUserWorkspaces(currentUser.uid);
      setWorkspaces(userWorkspaces);
      
      // Update current user role
      const updatedUser = {
        ...currentUser,
        role: 'CEO'
      };
      setCurrentUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Error promoting user to admin:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        error,
        workspaces,
        currentWorkspace,
        signIn,
        signUp,
        signOut,
        resetPassword,
        setActiveWorkspace,
        hasPermission,
        promoteToAdmin,
        isCEO,
        addWorkspaceToUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
