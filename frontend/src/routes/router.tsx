/* eslint-disable react-refresh/only-export-components */
import { Suspense, lazy } from 'react';
import { Navigate, Outlet, createBrowserRouter, useParams } from 'react-router-dom';
import paths, { rootPaths } from './paths';
import MainLayout from 'layouts/main-layout';
import AuthLayout from 'layouts/auth-layout';
import RequireAdmin from 'components/auth/RequireAdmin';
import Splash from 'components/loading/Splash';
import PageLoader from 'components/loading/PageLoader';

// Lazy load all onboarding steps
const OnboardingStep1 = lazy(() => import('pages/onboarding/Step1'));
const OnboardingStep2 = lazy(() => import('pages/onboarding/Step2'));
const OnboardingStep3 = lazy(() => import('pages/onboarding/Step3'));
const OnboardingStep4 = lazy(() => import('pages/onboarding/Step4'));
const OnboardingStep5 = lazy(() => import('pages/onboarding/Step5'));
const OnboardingStep6 = lazy(() => import('pages/onboarding/Step6'));
const OnboardingStep7 = lazy(() => import('pages/onboarding/Step7'));

// Onboarding step router component
const OnboardingRoutes = () => {
  const { step } = useParams<{ step: string }>();
  const stepNum = parseInt(step || '1', 10);

  switch (stepNum) {
    case 1:
      return <OnboardingStep1 />;
    case 2:
      return <OnboardingStep2 />;
    case 3:
      return <OnboardingStep3 />;
    case 4:
      return <OnboardingStep4 />;
    case 5:
      return <OnboardingStep5 />;
    case 6:
      return <OnboardingStep6 />;
    case 7:
      return <OnboardingStep7 />;
    default:
      return <Navigate to={paths.onboardingStep.replace(':step', '1')} replace />;
  }
};

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
              element: (
                <RequireAdmin>
                  <Dashboard />
                </RequireAdmin>
              ),
            },
            {
              path: paths.accessLogs,
              element: (
                <RequireAdmin>
                  <AccessLogsPage />
                </RequireAdmin>
              ),
            },
            {
              path: paths.decisionExplanation,
              element: (
                <RequireAdmin>
                  <DecisionExplainer />
                </RequireAdmin>
              ),
            },
            {
              path: paths.alerts,
              element: (
                <RequireAdmin>
                  <AlertsPage />
                </RequireAdmin>
              ),
            },
            {
              path: paths.users,
              element: (
                <RequireAdmin>
                  <UsersPage />
                </RequireAdmin>
              ),
            },
            {
              path: paths.accessPoints,
              element: (
                <RequireAdmin>
                  <AccessPointsPage />
                </RequireAdmin>
              ),
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
              element: (
                <RequireAdmin>
                  <PerformancePage />
                </RequireAdmin>
              ),
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
              path: paths.onboarding,
              element: (
                <RequireAdmin>
                  <OnboardingStep1 />
                </RequireAdmin>
              ),
            },
            {
              path: paths.onboardingStep,
              element: (
                <RequireAdmin>
                  <OnboardingRoutes />
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
