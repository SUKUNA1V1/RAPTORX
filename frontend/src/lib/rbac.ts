/**
 * Role-based access control utilities for frontend
 * Ensures users can only access and perform actions allowed by their role
 */

export type UserRole = 'admin' | 'security' | 'user' | 'guest';

export interface RolePermissions {
  canViewDashboard: boolean;
  canViewUsers: boolean;
  canCreateUser: boolean;
  canEditUser: boolean;
  canDeleteUser: boolean;
  canViewAccessPoints: boolean;
  canCreateAccessPoint: boolean;
  canEditAccessPoint: boolean;
  canDeleteAccessPoint: boolean;
  canViewAlerts: boolean;
  canResolveAlerts: boolean;
  canViewAccessLogs: boolean;
  canViewAdminSettings: boolean;
  canManageAdmins: boolean;
  canViewMFASettings: boolean;
  canEnableMFA: boolean;
  canViewDeviceCerts: boolean;
  canManageDeviceCerts: boolean;
  canViewExplainability: boolean;
  canViewMLStatus: boolean;
}

// Define permissions for each role
const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canViewDashboard: true,
    canViewUsers: true,
    canCreateUser: true,
    canEditUser: true,
    canDeleteUser: true,
    canViewAccessPoints: true,
    canCreateAccessPoint: true,
    canEditAccessPoint: true,
    canDeleteAccessPoint: true,
    canViewAlerts: true,
    canResolveAlerts: true,
    canViewAccessLogs: true,
    canViewAdminSettings: true,
    canManageAdmins: true,
    canViewMFASettings: true,
    canEnableMFA: true,
    canViewDeviceCerts: true,
    canManageDeviceCerts: true,
    canViewExplainability: true,
    canViewMLStatus: true,
  },
  security: {
    canViewDashboard: true,
    canViewUsers: true,
    canCreateUser: true,
    canEditUser: true,
    canDeleteUser: false,
    canViewAccessPoints: true,
    canCreateAccessPoint: false,
    canEditAccessPoint: false,
    canDeleteAccessPoint: false,
    canViewAlerts: true,
    canResolveAlerts: true,
    canViewAccessLogs: true,
    canViewAdminSettings: false,
    canManageAdmins: false,
    canViewMFASettings: true,
    canEnableMFA: true,
    canViewDeviceCerts: true,
    canManageDeviceCerts: false,
    canViewExplainability: true,
    canViewMLStatus: true,
  },
  user: {
    canViewDashboard: true,
    canViewUsers: false,
    canCreateUser: false,
    canEditUser: false,
    canDeleteUser: false,
    canViewAccessPoints: true,
    canCreateAccessPoint: false,
    canEditAccessPoint: false,
    canDeleteAccessPoint: false,
    canViewAlerts: false,
    canResolveAlerts: false,
    canViewAccessLogs: true,
    canViewAdminSettings: false,
    canManageAdmins: false,
    canViewMFASettings: true,
    canEnableMFA: true,
    canViewDeviceCerts: false,
    canManageDeviceCerts: false,
    canViewExplainability: true,
    canViewMLStatus: false,
  },
  guest: {
    canViewDashboard: true,
    canViewUsers: false,
    canCreateUser: false,
    canEditUser: false,
    canDeleteUser: false,
    canViewAccessPoints: true,
    canCreateAccessPoint: false,
    canEditAccessPoint: false,
    canDeleteAccessPoint: false,
    canViewAlerts: false,
    canResolveAlerts: false,
    canViewAccessLogs: false,
    canViewAdminSettings: false,
    canManageAdmins: false,
    canViewMFASettings: true,
    canEnableMFA: true,
    canViewDeviceCerts: false,
    canManageDeviceCerts: false,
    canViewExplainability: false,
    canViewMLStatus: false,
  },
};

/**
 * Get permissions for a specific role
 */
export function getPermissionsForRole(role: UserRole): RolePermissions {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.guest;
}

/**
 * Check if user can perform a specific action
 */
export function canPerformAction(
  role: UserRole,
  action: keyof RolePermissions
): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions[action] === true;
}

/**
 * Get list of allowed routes for a role
 */
export function getAllowedRoutes(role: UserRole): string[] {
  const permissions = getPermissionsForRole(role);
  const routes: string[] = [];

  if (permissions.canViewDashboard) routes.push('/');
  if (permissions.canViewUsers) routes.push('/users');
  if (permissions.canViewAccessPoints) routes.push('/access-points');
  if (permissions.canViewAlerts) routes.push('/alerts');
  if (permissions.canViewAccessLogs) routes.push('/access-logs');
  if (permissions.canViewAdminSettings) routes.push('/admin-settings');
  if (permissions.canViewExplainability) routes.push('/explainability');
  if (permissions.canViewMLStatus) routes.push('/ml-status');
  if (permissions.canViewMFASettings) routes.push('/settings/mfa');

  return routes;
}

/**
 * Check if user can access a route
 */
export function canAccessRoute(role: UserRole, route: string): boolean {
  const allowedRoutes = getAllowedRoutes(role);
  // Check exact match and parent routes
  return (
    allowedRoutes.includes(route) ||
    allowedRoutes.some((r) => route.startsWith(r + '/'))
  );
}

/**
 * Filter list of items based on user's visibility permissions
 */
export function filterVisibleItems<T extends { role?: string }>(
  items: T[],
  userRole: UserRole
): T[] {
  // Security role and above can see all users
  // Regular users can only see themselves
  if (userRole === 'admin' || userRole === 'security') {
    return items;
  }

  // For regular users, filter by visibility
  return items.filter((item) => {
    // Users can see their own profile, admins, and security
    if (userRole === 'user') {
      return item.role === 'admin' || item.role === 'security';
    }
    return false;
  });
}
