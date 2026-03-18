import type {
  RunListItem,
  RunDetail,
  SystemStatus,
  ContractStatus,
  CacheStatus,
  IntegrityStatus,
  JobResponse,
  JobStatus,
  RunTestsRequest,
  ApiResponse
} from '@breakline/ui-types';

const API_BASE = '/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, options);
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  const result: ApiResponse<T> = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Unknown error');
  }
  return result.data;
}

export const api = {
  getRuns: () => fetchApi<RunListItem[]>('/runs'),
  getRunDetail: (runId: string) => fetchApi<RunDetail>(`/runs/${runId}`),
  getSystemStatus: () => fetchApi<SystemStatus>('/system/status'),
  getContract: () => fetchApi<ContractStatus>('/contract'),
  getCache: () => fetchApi<CacheStatus>('/cache'),
  getIntegrity: () => fetchApi<IntegrityStatus>('/integrity'),

  // Actions
  runTests: (request?: RunTestsRequest) =>
    fetchApi<JobResponse>('/actions/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request || {})
    }),

  // Jobs
  getJob: (jobId: string) => fetchApi<JobStatus>(`/jobs/${jobId}`)
};
