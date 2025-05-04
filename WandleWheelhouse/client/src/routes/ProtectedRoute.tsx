import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: string[]; // Optional: Specify roles allowed to access
  children?: React.ReactNode; // Allow wrapping single elements if needed, besides Outlet
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation(); // Get current location for redirect state

  // 1. Wait for authentication status to load
  if (isLoading) {
    // You might want a proper loading spinner component here
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  // 2. Check if user is authenticated
  if (!isAuthenticated) {
    // User not logged in, redirect to home page (or a login page if you had one)
    // Pass the current location they tried to access, so we can redirect back after login (optional)
    console.log('ProtectedRoute: Not authenticated, redirecting to /');
    return <Navigate to="/" state={{ from: location }} replace />;
    // Or trigger login modal? More complex from here. Redirect is standard for routes.
  }

  // 3. Check if specific roles are required and if the user has them
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRequiredRole = user?.roles?.some(role => allowedRoles.includes(role)) ?? false;

    if (!hasRequiredRole) {
      // User is logged in but doesn't have the required role
      console.log(`ProtectedRoute: User lacks required roles (${allowedRoles.join(', ')}), redirecting to /`);
       // Redirect to an "Unauthorized" page or back home
      return <Navigate to="/" state={{ from: location }} replace />; // Redirect home for now
      // Alternatively: return <Navigate to="/unauthorized" replace />;
    }
  }

  // 4. User is authenticated and has necessary roles (if required)
  // Render the child component passed via props or the nested routes via <Outlet>
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;