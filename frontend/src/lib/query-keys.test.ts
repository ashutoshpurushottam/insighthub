import { describe, it, expect } from 'vitest';

import { queryKeys } from './query-keys';

describe('query-keys', () => {
  it('builds stable query keys for resources', () => {
    expect(queryKeys.reports.all).toEqual(['reports']);
    expect(queryKeys.reports.detail(5)).toEqual(['reports', 5]);
    expect(queryKeys.reports.parameters(5)).toEqual(['report-parameters', 5]);
    expect(queryKeys.reports.drillDowns(5)).toEqual(['drill-downs', 5]);

    expect(queryKeys.reportGroups.all).toEqual(['report-groups']);
    expect(queryKeys.reportGroups.detail(2)).toEqual(['report-groups', 2]);

    expect(queryKeys.datasources.all).toEqual(['datasources']);
    expect(queryKeys.datasources.detail(7)).toEqual(['datasources', 7]);

    expect(queryKeys.jobs.all).toEqual(['jobs']);
    expect(queryKeys.jobs.detail(4)).toEqual(['jobs', 4]);
    expect(queryKeys.jobs.history(3)).toEqual(['job-history', 3]);
    expect(queryKeys.jobs.running).toEqual(['running-jobs']);
    expect(queryKeys.jobs.schedules).toEqual(['schedules']);

    expect(queryKeys.dashboards.all).toEqual(['dashboards']);
    expect(queryKeys.dashboards.detail('home')).toEqual(['dashboard', 'home']);

    expect(queryKeys.rules.all).toEqual(['rules']);
    expect(queryKeys.rules.detail(8)).toEqual(['rules', 8]);
    expect(queryKeys.rules.values(8)).toEqual(['rule-values', 8]);

    expect(queryKeys.smtpServers.all).toEqual(['smtp-servers']);
    expect(queryKeys.smtpServers.detail(1)).toEqual(['smtp-servers', 1]);

    expect(queryKeys.userGroups.all).toEqual(['user-groups']);
    expect(queryKeys.userGroups.detail(9)).toEqual(['user-groups', 9]);

    expect(queryKeys.accessRights.all).toEqual(['access-rights']);
    expect(queryKeys.users.all).toEqual(['users']);
    expect(queryKeys.roles.all).toEqual(['roles']);

    expect(queryKeys.parameters.lov(9, 'west')).toEqual([
      'parameter-lov',
      9,
      'west',
    ]);
    expect(queryKeys.parameters.lov(9)).toEqual(['parameter-lov', 9, null]);
  });
});
