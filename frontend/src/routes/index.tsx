import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from './ProtectedRoute';

import { AppLayout } from '@/components/layout';
import { LoadingSpinner } from '@/components/ui';
import { LoginPage } from '@/features/auth';

// Lazy-loaded pages for code splitting
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

// Feature pages (full module)
const UsersPageWrapper = lazy(() =>
  import('@/features/users').then((m) => ({ default: m.UsersPage })),
);
const RolesPageWrapper = lazy(() =>
  import('@/features/roles').then((m) => ({ default: m.RolesPage })),
);
const DatasourcesPageWrapper = lazy(() =>
  import('@/features/datasources').then((m) => ({
    default: m.DatasourcesPage,
  })),
);
const ReportGroupsPageWrapper = lazy(() =>
  import('@/features/report-groups').then((m) => ({
    default: m.ReportGroupsPage,
  })),
);
const ReportsPageWrapper = lazy(() =>
  import('@/features/reports').then((m) => ({ default: m.ReportsPage })),
);
const ReportBuilderPageWrapper = lazy(() =>
  import('@/features/report-engine').then((m) => ({ default: m.ReportBuilderPage })),
);
const ReportRunnerPageWrapper = lazy(() =>
  import('@/features/report-engine').then((m) => ({ default: m.ReportRunnerPage })),
);
const GuardrailsSettingsPageWrapper = lazy(() =>
  import('@/features/report-engine').then((m) => ({ default: m.GuardrailsSettingsPage })),
);
const JobsPageWrapper = lazy(() =>
  import('@/features/jobs').then((m) => ({ default: m.JobsPage })),
);
const JobFormPageWrapper = lazy(() =>
  import('@/features/jobs').then((m) => ({ default: m.JobFormPage })),
);
const JobHistoryPageWrapper = lazy(() =>
  import('@/features/jobs').then((m) => ({ default: m.JobHistoryPage })),
);
const RunningJobsPageWrapper = lazy(() =>
  import('@/features/jobs').then((m) => ({ default: m.RunningJobsPage })),
);
const SmtpServersPageWrapper = lazy(() =>
  import('@/features/smtp-servers').then((m) => ({
    default: m.SmtpServersPage,
  })),
);
const DashboardsPageWrapper = lazy(() =>
  import('@/features/dashboards').then((m) => ({
    default: m.DashboardsPage,
  })),
);
const DashboardViewPageWrapper = lazy(() =>
  import('@/features/dashboards').then((m) => ({
    default: m.DashboardViewPage,
  })),
);
const UserGroupsPageWrapper = lazy(() =>
  import('@/features/user-groups').then((m) => ({
    default: m.UserGroupsPage,
  })),
);
const AccessRightsPageWrapper = lazy(() =>
  import('@/features/access-rights').then((m) => ({
    default: m.AccessRightsPage,
  })),
);
const RulesPageWrapper = lazy(() =>
  import('@/features/rules').then((m) => ({ default: m.RulesPage })),
);
const RuleValuesPageWrapper = lazy(() =>
  import('@/features/rules').then((m) => ({ default: m.RuleValuesPage })),
);

function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" className="mt-20" />}>
      {children}
    </Suspense>
  );
}

export function AppRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <LazyPage>
              <DashboardPage />
            </LazyPage>
          }
        />
        <Route
          path="reports"
          element={
            <LazyPage>
              <ReportsPageWrapper />
            </LazyPage>
          }
        />
        <Route
          path="reports/new"
          element={
            <LazyPage>
              <ReportBuilderPageWrapper />
            </LazyPage>
          }
        />
        <Route
          path="reports/:id/edit"
          element={
            <LazyPage>
              <ReportBuilderPageWrapper />
            </LazyPage>
          }
        />
        <Route
          path="reports/:id/run"
          element={
            <LazyPage>
              <ReportRunnerPageWrapper />
            </LazyPage>
          }
        />
        <Route
          path="guardrails"
          element={
            <LazyPage>
              <GuardrailsSettingsPageWrapper />
            </LazyPage>
          }
        />
        <Route
          path="users"
          element={
            <LazyPage>
              <UsersPageWrapper />
            </LazyPage>
          }
        />
        <Route
          path="roles"
          element={
            <LazyPage>
              <RolesPageWrapper />
            </LazyPage>
          }
        />
        <Route
          path="datasources"
          element={
            <LazyPage>
              <DatasourcesPageWrapper />
            </LazyPage>
          }
        />
        <Route
          path="report-groups"
          element={
            <LazyPage>
              <ReportGroupsPageWrapper />
            </LazyPage>
          }
        />
        <Route
          path="jobs"
          element={
            <LazyPage>
              <JobsPageWrapper />
            </LazyPage>
          }
        />
        <Route
          path="jobs/running"
          element={
            <LazyPage>
              <RunningJobsPageWrapper />
            </LazyPage>
          }
        />
        <Route
          path="jobs/new"
          element={
            <LazyPage>
              <JobFormPageWrapper />
            </LazyPage>
          }
        />
        <Route
          path="jobs/:id/edit"
          element={
            <LazyPage>
              <JobFormPageWrapper />
            </LazyPage>
          }
        />
        <Route
          path="jobs/:id/history"
          element={
            <LazyPage>
              <JobHistoryPageWrapper />
            </LazyPage>
          }
        />
        <Route
          path="smtp-servers"
          element={
            <LazyPage>
              <SmtpServersPageWrapper />
            </LazyPage>
          }
        />
        <Route
          path="dashboards"
          element={
            <LazyPage>
              <DashboardsPageWrapper />
            </LazyPage>
          }
        />
        <Route
          path="dashboards/:id"
          element={
            <LazyPage>
              <DashboardViewPageWrapper />
            </LazyPage>
          }
        />
        <Route
          path="user-groups"
          element={
            <LazyPage>
              <UserGroupsPageWrapper />
            </LazyPage>
          }
        />
        <Route
          path="access-rights"
          element={
            <LazyPage>
              <AccessRightsPageWrapper />
            </LazyPage>
          }
        />
        <Route
          path="rules"
          element={
            <LazyPage>
              <RulesPageWrapper />
            </LazyPage>
          }
        />
        <Route
          path="rule-values"
          element={
            <LazyPage>
              <RuleValuesPageWrapper />
            </LazyPage>
          }
        />
        <Route
          path="*"
          element={
            <LazyPage>
              <NotFoundPage />
            </LazyPage>
          }
        />
      </Route>
    </Routes>
  );
}
