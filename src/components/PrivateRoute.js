import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PrivateRoute = ({ children, requiredPermission = null }) => {
  const { currentUser, hasPermission } = useAuth();
  const location = useLocation();

  // Check if user is logged in
  if (!currentUser) {
    // Redirect to login page, but save the current location they were trying to access
    return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  }

  // If a specific permission is required, check if user has it
  if (requiredPermission && !hasPermission(requiredPermission)) {
    // Redirect to unauthorized page or dashboard
    return <Navigate to="/unauthorized" replace />;
  }

  // If user is authenticated and has required permissions, render the children
  return children;
};

export default PrivateRoute;
