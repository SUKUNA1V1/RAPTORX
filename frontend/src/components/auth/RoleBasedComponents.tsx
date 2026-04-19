/**
 * Role-based UI Components
 * Shows/hides UI elements based on user's RBAC permissions
 */

import { ReactNode } from 'react';
import { getSession } from '../../lib/auth';
import { canPerformAction, RolePermissions } from '../../lib/rbac';

interface IfRoleProps {
  children: ReactNode;
  permission: keyof RolePermissions;
  fallback?: ReactNode;
}

/**
 * IfRole Component - Conditionally renders based on role permission
 * Usage: <IfRole permission="canDeleteUser">Delete Button</IfRole>
 */
export const IfRole = ({ children, permission, fallback }: IfRoleProps) => {
  const session = getSession();

  if (!session) {
    return <>{fallback || null}</>;
  }

  const hasPermission = canPerformAction(session.role, permission);

  return <>{hasPermission ? children : fallback || null}</>;
};

interface RoleBasedProps {
  children: ReactNode;
  roles: string[];
  fallback?: ReactNode;
}

/**
 * RoleBased Component - Conditionally renders for specific roles
 * Usage: <RoleBased roles={['admin', 'security']}>Admin Panel</RoleBased>
 */
export const RoleBased = ({ children, roles, fallback }: RoleBasedProps) => {
  const session = getSession();

  if (!session || !roles.includes(session.role)) {
    return <>{fallback || null}</>;
  }

  return <>{children}</>;
};

interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * AdminOnly Component - Only renders for admin users
 */
export const AdminOnly = ({ children, fallback }: AdminOnlyProps) => (
  <RoleBased roles={['admin']} fallback={fallback}>
    {children}
  </RoleBased>
);

/**
 * SecurityOnly Component - Only renders for security staff and admins
 */
export const SecurityOnly = ({ children, fallback }: AdminOnlyProps) => (
  <RoleBased roles={['admin', 'security']} fallback={fallback}>
    {children}
  </RoleBased>
);

/**
 * UserOnly Component - Only renders for regular users and above
 */
export const UserOnly = ({ children, fallback }: AdminOnlyProps) => (
  <RoleBased roles={['admin', 'security', 'user']} fallback={fallback}>
    {children}
  </RoleBased>
);

export default IfRole;
