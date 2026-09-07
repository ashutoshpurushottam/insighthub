import { z } from 'zod';

export const DATABASE_TYPES = [
  { value: 'H2', label: 'H2', driver: 'org.h2.Driver', sampleUrl: 'jdbc:h2:mem:testdb' },
  { value: 'PostgreSQL', label: 'PostgreSQL', driver: 'org.postgresql.Driver', sampleUrl: 'jdbc:postgresql://localhost:5432/mydb' },
  { value: 'MySQL', label: 'MySQL', driver: 'com.mysql.cj.jdbc.Driver', sampleUrl: 'jdbc:mysql://localhost:3306/mydb' },
  { value: 'MariaDB', label: 'MariaDB', driver: 'org.mariadb.jdbc.Driver', sampleUrl: 'jdbc:mariadb://localhost:3306/mydb' },
  { value: 'Oracle', label: 'Oracle', driver: 'oracle.jdbc.OracleDriver', sampleUrl: 'jdbc:oracle:thin:@localhost:1521:orcl' },
  { value: 'SQL Server', label: 'SQL Server', driver: 'com.microsoft.sqlserver.jdbc.SQLServerDriver', sampleUrl: 'jdbc:sqlserver://localhost:1433;databaseName=mydb' },
  { value: 'DB2', label: 'IBM DB2', driver: 'com.ibm.db2.jcc.DB2Driver', sampleUrl: 'jdbc:db2://localhost:50000/mydb' },
  { value: 'SQLite', label: 'SQLite', driver: 'org.sqlite.JDBC', sampleUrl: 'jdbc:sqlite:/path/to/database.db' },
  { value: 'HSQLDB', label: 'HSQLDB', driver: 'org.hsqldb.jdbc.JDBCDriver', sampleUrl: 'jdbc:hsqldb:mem:testdb' },
  { value: 'Informix', label: 'Informix', driver: 'com.informix.jdbc.IfxDriver', sampleUrl: 'jdbc:informix-sqli://localhost:9088/mydb:INFORMIXSERVER=server' },
  { value: 'Firebird', label: 'Firebird', driver: 'org.firebirdsql.jdbc.FBDriver', sampleUrl: 'jdbc:firebirdsql://localhost:3050/mydb' },
  { value: 'Other', label: 'Other (custom driver)', driver: '', sampleUrl: '' },
] as const;

export const datasourceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  description: z.string().max(200).optional(),
  databaseType: z.string().min(1, 'Database type is required'),
  driver: z.string().max(200).optional(),
  url: z.string().min(1, 'URL is required').max(2000),
  username: z.string().max(100).optional(),
  password: z.string().max(200).optional(),
  testSql: z.string().max(60).optional(),
  active: z.boolean(),
});

export type DatasourceFormData = z.infer<typeof datasourceSchema>;

export function lookupDatabaseType(value: string) {
  return DATABASE_TYPES.find((t) => t.value === value);
}

/**
 * Basic JDBC URL sanity check (protocol + host-ish segment).
 */
export function isLikelyJdbcUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed.toLowerCase().startsWith('jdbc:')) return false;
  return trimmed.length > 8 && trimmed.includes(':');
}
