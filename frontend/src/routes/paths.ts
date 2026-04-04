export const rootPaths = {
  root: '/',
  pagesRoot: 'pages',
  authRoot: 'authentication',
};

export default {
  dashboard: rootPaths.root,
  accessLogs: `/${rootPaths.pagesRoot}/access-logs`,
  decisionExplanation: `/${rootPaths.pagesRoot}/decision-explanation/:logId`,
  alerts: `/${rootPaths.pagesRoot}/alerts`,
  users: `/${rootPaths.pagesRoot}/users`,
  accessPoints: `/${rootPaths.pagesRoot}/access-points`,
  mlStatus: `/${rootPaths.pagesRoot}/ml-status`,
  explainability: `/${rootPaths.pagesRoot}/explainability`,
  performance: `/${rootPaths.pagesRoot}/performance`,
  usersManage: `/${rootPaths.pagesRoot}/users/manage`,
  accessPointsManage: `/${rootPaths.pagesRoot}/access-points/manage`,
  simulator: `/${rootPaths.pagesRoot}/simulator`,
  adminSettings: `/${rootPaths.pagesRoot}/admin-settings`,

  login: `/${rootPaths.authRoot}/login`,
};
