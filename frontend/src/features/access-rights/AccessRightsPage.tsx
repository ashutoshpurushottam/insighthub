import { useMutation, useQuery } from '@tanstack/react-query';
import { Save, Shield } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { LoadingSpinner, PageHeader } from '@/components/ui';
import { fetchReportGroups } from '@/features/report-groups/api';
import { fetchReports } from '@/features/reports/api';
import { fetchUserGroups } from '@/features/user-groups/api';
import { fetchUsers } from '@/features/users/api';

import {
  getUserGroupReportGroupRights,
  getUserGroupReportRights,
  getUserReportGroupRights,
  getUserReportRights,
  setUserGroupReportGroupRights,
  setUserGroupReportRights,
  setUserReportGroupRights,
  setUserReportRights,
} from './api';

type SubjectType = 'user' | 'userGroup';

export function AccessRightsPage() {
  const [subjectType, setSubjectType] = useState<SubjectType>('user');
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [selectedReports, setSelectedReports] = useState<number[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
  const { data: userGroups } = useQuery({
    queryKey: ['user-groups'],
    queryFn: fetchUserGroups,
  });
  const { data: reports } = useQuery({
    queryKey: ['reports'],
    queryFn: fetchReports,
  });
  const { data: reportGroups } = useQuery({
    queryKey: ['report-groups'],
    queryFn: fetchReportGroups,
  });

  // Load existing rights when subject changes
  const loadRights = useCallback(async () => {
    if (!subjectId) {
      setSelectedReports([]);
      setSelectedGroups([]);
      setLoaded(false);
      return;
    }

    setLoading(true);
    try {
      let rIds: number[] = [];
      let gIds: number[] = [];

      if (subjectType === 'user') {
        [rIds, gIds] = await Promise.all([
          getUserReportRights(subjectId),
          getUserReportGroupRights(subjectId),
        ]);
      } else {
        [rIds, gIds] = await Promise.all([
          getUserGroupReportRights(subjectId),
          getUserGroupReportGroupRights(subjectId),
        ]);
      }

      setSelectedReports(rIds);
      setSelectedGroups(gIds);
      setLoaded(true);
    } catch {
      // No existing rights — start empty
      setSelectedReports([]);
      setSelectedGroups([]);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [subjectId, subjectType]);

  useEffect(() => {
    loadRights();
  }, [loadRights]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!subjectId) return;
      if (subjectType === 'user') {
        await setUserReportRights(subjectId, selectedReports);
        await setUserReportGroupRights(subjectId, selectedGroups);
      } else {
        await setUserGroupReportRights(subjectId, selectedReports);
        await setUserGroupReportGroupRights(subjectId, selectedGroups);
      }
    },
    onSuccess: () => toast.success('Access rights saved'),
    onError: () => toast.error('Failed to save'),
  });

  const toggleReport = (id: number) => {
    setSelectedReports((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleGroup = (id: number) => {
    setSelectedGroups((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div>
      <PageHeader
        title="Access Rights"
        description="Assign reports and report groups to users or user groups"
      />

      {/* Subject selection */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Assign to</label>
            <select
              className="input-field"
              value={subjectType}
              onChange={(e) => {
                setSubjectType(e.target.value as SubjectType);
                setSubjectId(null);
                setLoaded(false);
              }}
            >
              <option value="user">User</option>
              <option value="userGroup">User Group</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">
              {subjectType === 'user' ? 'Select User' : 'Select User Group'}
            </label>
            <select
              className="input-field"
              value={subjectId ?? ''}
              onChange={(e) => setSubjectId(Number(e.target.value) || null)}
            >
              <option value="">Choose...</option>
              {subjectType === 'user'
                ? users?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.username}
                    </option>
                  ))
                : userGroups?.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <LoadingSpinner size="md" className="mt-8" />}

      {subjectId && loaded && !loading && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Report Groups */}
          <div className="card">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
              <Shield className="h-4 w-4 text-primary-600" />
              Report Groups
            </h3>
            <p className="mb-3 text-xs text-gray-500">
              Granting access to a group gives access to all reports within it.
            </p>
            <div className="max-h-60 space-y-1 overflow-y-auto">
              {reportGroups?.map((g) => (
                <label
                  key={g.id}
                  className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-sm hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(g.id)}
                    onChange={() => toggleGroup(g.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="flex-1">{g.name}</span>
                  <span className="text-xs text-gray-400">
                    {g.reportCount} reports
                  </span>
                </label>
              ))}
              {(!reportGroups || reportGroups.length === 0) && (
                <p className="py-4 text-center text-sm text-gray-400">
                  No report groups available
                </p>
              )}
            </div>
          </div>

          {/* Individual Reports */}
          <div className="card">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
              <Shield className="h-4 w-4 text-green-600" />
              Individual Reports
            </h3>
            <p className="mb-3 text-xs text-gray-500">
              Grant access to specific reports (in addition to group-level
              access).
            </p>
            <div className="max-h-60 space-y-1 overflow-y-auto">
              {reports?.map((r) => (
                <label
                  key={r.id}
                  className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-sm hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedReports.includes(r.id)}
                    onChange={() => toggleReport(r.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="flex-1">{r.name}</span>
                  <span className="text-xs text-gray-400">
                    {r.reportGroupName}
                  </span>
                </label>
              ))}
              {(!reports || reports.length === 0) && (
                <p className="py-4 text-center text-sm text-gray-400">
                  No reports available
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {subjectId && loaded && !loading && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="btn-primary"
          >
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save Access Rights'}
          </button>
        </div>
      )}
    </div>
  );
}
