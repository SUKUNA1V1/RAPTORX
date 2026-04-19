/**
 * Role-based Protected Route Component
 * Ensures only users with required roles can access the route
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getSession } from '../../lib/auth';
import { canAccessRoute } from '../../lib/rbac';
import paths from '../../routes/paths';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoute: string;
  fallbackRoute?: string;
}

/**
 * ProtectedRoute component that checks RBAC before rendering
 */
export const ProtectedRoute = ({
  children,
  requiredRoute,
  fallbackRoute = paths.dashboard,
}: ProtectedRouteProps) => {
  const session = getSession();

  // Not authenticated - redirect to login
  if (!session) {
    return <Navigate to={paths.login} replace />;
  }

  // Check if user's role allows access to this route
  if (!canAccessRoute(session.role, requiredRoute)) {
    return <Navigate to={fallbackRoute} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
