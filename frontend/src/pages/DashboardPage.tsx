import { useQuery } from '@tanstack/react-query';
import { BarChart3, Database, FileText, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/ui';
import { useAuthStore } from '@/features/auth';
import { fetchDatasources } from '@/features/datasources/api';
import { fetchJobs } from '@/features/jobs/api';
import { fetchReports } from '@/features/reports/api';
import { fetchUsers } from '@/features/users/api';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  onClick?: () => void;
}

function StatCard({ title, value, icon: Icon, color, onClick }: StatCardProps) {
  return (
    <div
      className={`card flex items-center gap-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className={`rounded-lg p-3 ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const { data: reports } = useQuery({
    queryKey: ['reports'],
    queryFn: fetchReports,
  });
  const { data: datasources } = useQuery({
    queryKey: ['datasources'],
    queryFn: fetchDatasources,
  });
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
  });

  const activeJobs = jobs?.filter((j) => j.active) ?? [];
  const recentReports = reports?.slice(0, 5) ?? [];
  const recentJobs = jobs?.slice(0, 5) ?? [];

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.fullName || user?.username || 'User'}`}
        description="Overview of your reporting environment"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Reports"
          value={reports?.length ?? 0}
          icon={BarChart3}
          color="bg-blue-500"
          onClick={() => navigate('/reports')}
        />
        <StatCard
          title="Datasources"
          value={datasources?.length ?? 0}
          icon={Database}
          color="bg-green-500"
          onClick={() => navigate('/datasources')}
        />
        <StatCard
          title="Users"
          value={users?.length ?? 0}
          icon={Users}
          color="bg-purple-500"
          onClick={() => navigate('/users')}
        />
        <StatCard
          title="Active Jobs"
          value={activeJobs.length}
          icon={FileText}
          color="bg-orange-500"
          onClick={() => navigate('/jobs')}
        />
      </div>

      {/* Recent activity */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Reports */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Recent Reports
          </h2>
          {recentReports.length === 0 ? (
            <p className="text-sm text-gray-500">No reports yet.</p>
          ) : (
            <div className="space-y-3">
              {recentReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {report.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {report.reportGroupName || 'Ungrouped'}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      report.active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {report.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Jobs */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Job Status
          </h2>
          {recentJobs.length === 0 ? (
            <p className="text-sm text-gray-500">No jobs scheduled.</p>
          ) : (
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {job.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {job.scheduleName || 'Manual'} • {job.reportName}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      job.lastRunStatus === 'SUCCESS'
                        ? 'bg-green-100 text-green-700'
                        : job.lastRunStatus === 'FAILED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {job.lastRunStatus || 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
