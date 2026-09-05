import { describe, it, expect } from 'vitest';

import {
  buildDefaultParamValues,
  countFilledParams,
  flattenParamValues,
  mergeParamValues,
  paramsToSearchParams,
  searchParamsToParamValues,
  summarizeParamValues,
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
});
