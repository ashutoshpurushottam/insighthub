import { describe, it, expect } from 'vitest';

import {
  buildDefaultParamValues,
  buildDrillDownPath,
  canAutoRunReport,
  countFilledParams,
  flattenParamValues,
  isDrillDownNavigation,
  mergeParamValues,
  paramsToSearchParams,
  resolveParentReportPath,
  searchParamsToParamValues,
  shouldAutoRunFromSearch,
  summarizeParamValues,
  urlSearchToOverrides,
  validateParamValues,
  type RunnerParameter,
} from './runner-utils';

const parameters: RunnerParameter[] = [
  { name: 'region', label: 'Region', required: true, defaultValue: 'West' },
  { name: 'tags', label: 'Tags', multiValue: true, defaultValue: 'a,b' },
  { name: 'secret', label: 'Secret', hidden: true, defaultValue: 'x' },
  { name: 'optional', label: 'Optional', required: false },
];

describe('runner-utils', () => {
  it('builds defaults including multi-value split', () => {
    const defaults = buildDefaultParamValues(parameters);
    expect(defaults.region).toBe('West');
    expect(defaults.tags).toEqual(['a', 'b']);
    expect(defaults.secret).toBe('x');
  });

  it('validates required parameters', () => {
    expect(
      validateParamValues(parameters, { region: '', tags: [], secret: 'x' }),
    ).toContain('Region is required');

    expect(
      validateParamValues(parameters, { region: 'East', tags: ['a'], secret: 'x' }),
    ).toEqual([]);
  });

  it('flattens values and syncs with URL search params', () => {
    const flat = flattenParamValues({ region: 'West', tags: ['a', 'b'], skip: null });
    expect(flat).toEqual({ region: 'West', tags: ['a', 'b'] });

    const joined = flattenParamValues({ tags: ['a', 'b'] }, true);
    expect(joined.tags).toBe('a,b');

    const sp = paramsToSearchParams({ region: 'West', tags: ['a', 'b'] });
    expect(sp.get('region')).toBe('West');
    expect(sp.getAll('tags')).toEqual(['a', 'b']);

    const parsed = searchParamsToParamValues(sp, parameters);
    expect(parsed.region).toBe('West');
    expect(parsed.tags).toEqual(['a', 'b']);
  });

  it('merges values and summarizes filters', () => {
    const merged = mergeParamValues(
      { region: 'West' },
      { region: 'East', optional: '1' },
    );
    expect(merged.region).toBe('East');

    const counts = countFilledParams(parameters, {
      region: 'West',
      tags: [],
      secret: 'x',
      optional: '',
    });
    expect(counts.totalVisible).toBe(3);
    expect(counts.filled).toBe(1);

    expect(
      summarizeParamValues(parameters, { region: 'West', tags: ['a', 'b'] }),
    ).toContain('Region: West');
  });

  it('does not let missing URL keys wipe defaults on merge', () => {
    const defaults = buildDefaultParamValues(parameters);
    const overrides = urlSearchToOverrides('region=East&_ihFrom=3', parameters);
    expect(overrides).toEqual({ region: 'East' });

    const merged = mergeParamValues(defaults, overrides);
    expect(merged.region).toBe('East');
    expect(merged.tags).toEqual(['a', 'b']);
    expect(merged.secret).toBe('x');
  });

  it('builds drill-down paths with parent context', () => {
    const path = buildDrillDownPath({
      childReportId: 5,
      triggerColumn: 'customer',
      triggerValue: 'Acme',
      row: { customer: 'Acme', region: 'West' },
      paramMappings: [
        { parentColumnName: 'customer', childParamName: 'cust' },
        { parentColumnName: 'region', childParamName: 'reg' },
      ],
      parentReportId: 12,
      parentPage: 2,
    });
    expect(path).toBe(
      '/reports/5/run?cust=Acme&reg=West&_ihFrom=12&_ihFromPage=2',
    );
  });

  it('detects drill-down navigation and resolves parent path', () => {
    expect(isDrillDownNavigation('_ihFrom=12&cust=Acme')).toBe(true);
    expect(isDrillDownNavigation('')).toBe(false);
    expect(isDrillDownNavigation('_ihReturn=1&page=3')).toBe(false);
    expect(shouldAutoRunFromSearch('_ihReturn=1&page=3')).toBe(true);
    expect(shouldAutoRunFromSearch('')).toBe(false);
    expect(resolveParentReportPath('_ihFrom=12&_ihFromPage=3')).toBe(
      '/reports/12/run?_ihReturn=1&page=3',
    );
    expect(resolveParentReportPath('cust=Acme')).toBeNull();
  });

  it('can auto-run when required params are present', () => {
    expect(
      canAutoRunReport(parameters, { region: 'East', tags: ['a'], secret: 'x' }),
    ).toBe(true);
    expect(
      canAutoRunReport(parameters, { region: '', tags: [], secret: 'x' }),
    ).toBe(false);
  });
});
