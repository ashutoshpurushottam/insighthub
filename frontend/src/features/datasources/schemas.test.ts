import { describe, it, expect } from 'vitest';

import {
  datasourceSchema,
  isLikelyJdbcUrl,
  lookupDatabaseType,
} from './schemas';

describe('datasources schemas', () => {
  it('accepts a valid datasource', () => {
    const result = datasourceSchema.safeParse({
      name: 'Local PG',
      databaseType: 'PostgreSQL',
      url: 'jdbc:postgresql://localhost:5432/db',
      active: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing name and url', () => {
    const result = datasourceSchema.safeParse({
      name: '',
      databaseType: 'H2',
      url: '',
      active: true,
    });
    expect(result.success).toBe(false);
  });

  it('looks up database metadata and validates JDBC URLs', () => {
    expect(lookupDatabaseType('PostgreSQL')?.driver).toContain('postgresql');
    expect(isLikelyJdbcUrl('jdbc:h2:mem:test')).toBe(true);
    expect(isLikelyJdbcUrl('http://example')).toBe(false);
  });
});
