import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Zap } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

import {
  createDatasource,
  testConnectionDirect,
  updateDatasource,
  type Datasource,
} from './api';

const DATABASE_TYPES = [
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
];

const schema = z.object({
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

type FormData = z.infer<typeof schema>;

interface Props {
  datasource?: Datasource | null;
  onClose: () => void;
}

export function DatasourceFormModal({ datasource, onClose }: Props) {
  const isEdit = !!datasource;
  const queryClient = useQueryClient();
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? {
          name: datasource.name,
          description: datasource.description ?? '',
          databaseType: datasource.databaseType ?? '',
          driver: datasource.driver ?? '',
          url: datasource.url ?? '',
          username: datasource.username ?? '',
          password: '',
          testSql: datasource.testSql ?? '',
          active: datasource.active,
        }
      : { active: true, testSql: 'SELECT 1' },
  });

  const handleDbTypeChange = (type: string) => {
    const dbDef = DATABASE_TYPES.find((d) => d.value === type);
    if (dbDef) {
      setValue('driver', dbDef.driver);
      if (dbDef.sampleUrl && !getValues('url')) {
        setValue('url', dbDef.sampleUrl);
      }
    }
  };

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      if (isEdit) {
        return updateDatasource(datasource.id, data);
      }
      return createDatasource({ ...data, databaseType: data.databaseType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasources'] });
      toast.success(isEdit ? 'Datasource updated' : 'Datasource created');
      onClose();
    },
    onError: () => toast.error('Failed to save datasource'),
  });

  const handleTest = async () => {
    const values = getValues();
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testConnectionDirect({
        url: values.url,
        username: values.username,
        password: values.password,
        driver: values.driver,
        testSql: values.testSql,
      });
      setTestResult(result);
    } catch {
      setTestResult({ success: false, message: 'Test request failed' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Datasource' : 'Add Datasource'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="space-y-4"
        >
          <div>
            <label className="label">Name</label>
            <input className="input-field" {...register('name')} />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label className="label">Database Type</label>
            <select
              className="input-field"
              {...register('databaseType')}
              onChange={(e) => {
                register('databaseType').onChange(e);
                handleDbTypeChange(e.target.value);
              }}
            >
              <option value="">Select...</option>
              {DATABASE_TYPES.map((db) => (
                <option key={db.value} value={db.value}>
                  {db.label}
                </option>
              ))}
            </select>
            {errors.databaseType && (
              <p className="mt-1 text-xs text-red-600">
                {errors.databaseType.message}
              </p>
            )}
          </div>

          <div>
            <label className="label">JDBC Driver</label>
            <input
              className="input-field"
              {...register('driver')}
              placeholder="e.g. org.postgresql.Driver"
            />
          </div>

          <div>
            <label className="label">JDBC URL</label>
            <input
              className="input-field"
              {...register('url')}
              placeholder="jdbc:postgresql://localhost:5432/mydb"
            />
            {errors.url && (
              <p className="mt-1 text-xs text-red-600">
                {errors.url.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Username</label>
              <input className="input-field" {...register('username')} />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input-field"
                {...register('password')}
                placeholder={isEdit ? '(unchanged)' : ''}
              />
            </div>
          </div>

          <div>
            <label className="label">Test SQL</label>
            <input
              className="input-field"
              {...register('testSql')}
              placeholder="SELECT 1"
            />
          </div>

          <div>
            <label className="label">Description</label>
            <input className="input-field" {...register('description')} />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              {...register('active')}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="active" className="text-sm text-gray-700">
              Active
            </label>
          </div>

          {/* Test Connection */}
          <div className="rounded-md border border-gray-200 p-3">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !watch('url')}
              className="btn-secondary w-full"
            >
              <Zap className="mr-2 h-4 w-4" />
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            {testResult && (
              <p
                className={`mt-2 text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}
              >
                {testResult.success ? '✓' : '✗'} {testResult.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary"
            >
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
