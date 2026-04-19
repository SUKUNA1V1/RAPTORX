import paths from './paths';

export interface SubMenuItem {
  name: string;
  pathName: string;
  path: string;
  active?: boolean;
  items?: SubMenuItem[];
}

export interface MenuItem {
  id: string;
  subheader: string;
  path?: string;
  icon?: string;
  avatar?: string;
  active?: boolean;
  badge?: number;
  items?: SubMenuItem[];
}

const sitemap: MenuItem[] = [
  {
    id: 'dashboard',
    subheader: 'Dashboard',
    path: paths.dashboard,
    icon: 'mingcute:home-1-fill',
    active: true,
  },
  {
    id: 'access-logs',
    subheader: 'Access Logs',
    path: paths.accessLogs,
    icon: 'mingcute:document-2-fill',
  },
  {
    id: 'alerts',
    subheader: 'Alerts',
    path: paths.alerts,
    icon: 'mingcute:notification-fill',
  },
  {
    id: 'users',
    subheader: 'Users',
    path: paths.users,
    icon: 'mingcute:user-2-fill',
  },
  {
    id: 'access-points',
    subheader: 'Access Points',
    path: paths.accessPoints,
    icon: 'mdi:view-grid',
  },
  {
    id: 'performance',
    subheader: 'Performance',
    path: paths.performance,
    icon: 'mdi:power-plug',
  },
  {
    id: 'admin-tools',
    subheader: 'Admin Tools',
    icon: 'mingcute:safe-lock-fill',
    items: [
      {
        name: 'Onboarding',
        pathName: 'onboarding',
        path: paths.onboarding,
      },
      {
        name: 'ML Status',
        pathName: 'ml-status',
        path: paths.mlStatus,
      },
      {
        name: 'Explainability',
        pathName: 'explainability',
        path: paths.explainability,
      },
      {
        name: 'Simulator',
        pathName: 'simulator',
        path: paths.simulator,
      },
      {
        name: 'Manage Users',
        pathName: 'users-manage',
        path: paths.usersManage,
      },
      {
        name: 'Manage Access Points',
        pathName: 'access-points-manage',
        path: paths.accessPointsManage,
      },
      {
        name: 'Settings',
        pathName: 'admin-settings',
        path: paths.adminSettings,
      },
    ],
  },
];

export default sitemap;
