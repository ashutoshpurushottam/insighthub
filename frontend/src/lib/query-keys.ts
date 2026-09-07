/**
 * Centralized React Query key factories.
 * Keeps cache invalidation consistent across feature modules.
 */

export const queryKeys = {
  reports: {
    all: ['reports'] as const,
    detail: (id: number) => ['reports', id] as const,
    parameters: (id: number) => ['report-parameters', id] as const,
    drillDowns: (id: number) => ['drill-downs', id] as const,
  },
  reportGroups: {
    all: ['report-groups'] as const,
    detail: (id: number) => ['report-groups', id] as const,
  },
  datasources: {
    all: ['datasources'] as const,
    detail: (id: number) => ['datasources', id] as const,
  },
  jobs: {
    all: ['jobs'] as const,
    detail: (id: number) => ['jobs', id] as const,
    history: (id: number) => ['job-history', id] as const,
    running: ['running-jobs'] as const,
    schedules: ['schedules'] as const,
  },
  dashboards: {
    all: ['dashboards'] as const,
    detail: (id: number | string) => ['dashboard', id] as const,
  },
  rules: {
    all: ['rules'] as const,
    detail: (id: number) => ['rules', id] as const,
    values: (id: number) => ['rule-values', id] as const,
  },
  smtpServers: {
    all: ['smtp-servers'] as const,
    detail: (id: number) => ['smtp-servers', id] as const,
  },
  userGroups: {
    all: ['user-groups'] as const,
    detail: (id: number) => ['user-groups', id] as const,
  },
  accessRights: {
    all: ['access-rights'] as const,
  },
  users: {
    all: ['users'] as const,
  },
  roles: {
    all: ['roles'] as const,
  },
  parameters: {
    lov: (parameterId: number, parentValue?: string) =>
      ['parameter-lov', parameterId, parentValue ?? null] as const,
  },
} as const;

export type QueryKeys = typeof queryKeys;
