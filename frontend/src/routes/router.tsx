/* eslint-disable react-refresh/only-export-components */
import { Suspense, lazy } from 'react';
import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom';
import paths, { rootPaths } from './paths';
import MainLayout from 'layouts/main-layout';
import AuthLayout from 'layouts/auth-layout';
import RequireAdmin from 'components/auth/RequireAdmin';
import Splash from 'components/loading/Splash';
import PageLoader from 'components/loading/PageLoader';

const App = lazy(() => import('App'));
const Dashboard = lazy(() => import('pages/dashboard'));
const AccessLogsPage = lazy(() => import('pages/modules/AccessLogsPage'));
const AlertsPage = lazy(() => import('pages/modules/AlertsPage'));
const UsersPage = lazy(() => import('pages/modules/UsersPage'));
const AccessPointsPage = lazy(() => import('pages/modules/AccessPointsPage'));
const MlStatusPage = lazy(() => import('pages/modules/MlStatusPage'));
const ExplainabilityPage = lazy(() => import('pages/modules/ExplainabilityPage'));
const PerformancePage = lazy(() => import('pages/modules/PerformancePage'));
const SimulatorPage = lazy(() => import('pages/modules/SimulatorPage'));
const UsersManagement = lazy(() => import('pages/modules/UsersManagement'));
const AccessPointsManagement = lazy(() => import('pages/modules/AccessPointsManagement'));
const AdminSettingsPage = lazy(() => import('pages/modules/AdminSettingsPage'));
const DecisionExplainer = lazy(() => import('components/DecisionExplainer'));
const Login = lazy(() => import('pages/authentication/Login'));

const ROUTER_BASENAME = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

const router = createBrowserRouter(
  [
    {
      element: (
        <Suspense fallback={<Splash />}>
          <App />
        </Suspense>
      ),
      children: [
        {
          path: '/',
          element: (
            <MainLayout>
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </MainLayout>
          ),
          children: [
            {
              index: true,
              element: <Dashboard />,
            },
            {
              path: paths.accessLogs,
              element: <AccessLogsPage />,
            },
            {
              path: paths.decisionExplanation,
              element: <DecisionExplainer />,
            },
            {
              path: paths.alerts,
              element: <AlertsPage />,
            },
            {
              path: paths.users,
              element: <UsersPage />,
            },
            {
              path: paths.accessPoints,
              element: <AccessPointsPage />,
            },
            {
              path: paths.mlStatus,
              element: (
                <RequireAdmin>
                  <MlStatusPage />
                </RequireAdmin>
              ),
            },
            {
              path: paths.explainability,
              element: (
                <RequireAdmin>
                  <ExplainabilityPage />
                </RequireAdmin>
              ),
            },
            {
              path: paths.performance,
              element: <PerformancePage />,
            },
            {
              path: paths.simulator,
              element: (
                <RequireAdmin>
                  <SimulatorPage />
                </RequireAdmin>
              ),
            },
            {
              path: paths.usersManage,
              element: (
                <RequireAdmin>
                  <UsersManagement />
                </RequireAdmin>
              ),
            },
            {
              path: paths.accessPointsManage,
              element: (
                <RequireAdmin>
                  <AccessPointsManagement />
                </RequireAdmin>
              ),
            },
            {
              path: paths.adminSettings,
              element: (
                <RequireAdmin>
                  <AdminSettingsPage />
                </RequireAdmin>
              ),
            },
            {
              path: '*',
              element: <Navigate to={paths.dashboard} replace />,
            },
          ],
        },
        {
          path: rootPaths.authRoot,
          element: (
            <AuthLayout>
              <Outlet />
            </AuthLayout>
          ),
          children: [
            {
              path: paths.login,
              element: <Login />,
            },
          ],
        },
      ],
    },
  ],
  {
    basename: ROUTER_BASENAME,
  }
);

export default router;
