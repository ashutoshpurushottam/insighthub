import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

import type { LovOption } from '../types';

/**
 * Fetches LOV (List of Values) options for a parameter.
 * Supports cascading: when parentValue changes, the query refetches.
 */
async function fetchLovOptions(
  parameterId: number,
  parentValue?: string,
): Promise<LovOption[]> {
  const params: Record<string, string> = {};
  if (parentValue) {
    params.parentValue = parentValue;
  }
  const { data } = await apiClient.get<LovOption[]>(
    `/parameters/${parameterId}/lov`,
    { params },
  );
  return data;
}

interface UseParameterLovOptions {
  /** The parameter ID to fetch LOV options for */
  parameterId: number;
  /** The current parent parameter value (for cascading) */
  parentValue?: string;
  /** Whether the query should be enabled */
  enabled?: boolean;
}

/**
 * Hook for fetching cascading LOV options using TanStack Query.
 *
 * Query key includes parameter ID + parent value so that
 * changes to the parent value automatically trigger a refetch.
 */
export function useParameterLov({
  parameterId,
  parentValue,
  enabled = true,
}: UseParameterLovOptions) {
  return useQuery({
    queryKey: ['parameter-lov', parameterId, parentValue ?? ''],
    queryFn: () => fetchLovOptions(parameterId, parentValue),
    enabled: enabled && !!parameterId,
    staleTime: 30_000, // Cache LOV options for 30s
    retry: 1,
  });
}
