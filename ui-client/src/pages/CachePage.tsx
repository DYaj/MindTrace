import { useState, useEffect } from 'react';
import { useCache } from '../hooks/useCache';
import { useContract } from '../hooks/useContract';
import { AlertTriangle, CheckCircle, Database, FileText, Play, Loader } from 'lucide-react';

export function CachePage() {
  const { data: cache, isLoading, error, refetch } = useCache();
  const { data: contract } = useContract();

  // Build cache job state
  const [buildingJob, setBuildingJob] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [jobSuccess, setJobSuccess] = useState<boolean>(false);

  // Poll job status
  useEffect(() => {
    if (!buildingJob) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/jobs/${buildingJob}`);
        const data = await response.json();

        if (!data.success) {
          setJobError(data.error || 'Job failed');
          setBuildingJob(null);
          return;
        }

        const job = data.data;

        if (job.status === 'completed') {
          setBuildingJob(null);
          setJobError(null);
          setJobSuccess(true);
          refetch(); // Refresh cache data
          // Clear success message after 5 seconds
          setTimeout(() => setJobSuccess(false), 5000);
        } else if (job.status === 'failed') {
          setJobError(job.result?.error || 'Job failed');
          setBuildingJob(null);
        }
      } catch (err) {
        setJobError(err instanceof Error ? err.message : 'Failed to check job status');
        setBuildingJob(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [buildingJob, refetch]);

  const handleBuildCache = async () => {
    setJobError(null);
    setJobSuccess(false);
    try {
      const response = await fetch('http://localhost:3001/api/actions/build-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!data.success) {
        setJobError(data.error || 'Failed to start cache build');
        return;
      }

      setBuildingJob(data.data.jobId);
    } catch (err) {
      setJobError(err instanceof Error ? err.message : 'Failed to start cache build');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load cache: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  if (!cache || !cache.exists) {
    const contractMissing = !contract || !contract.exists;

    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Cache</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <Database className="mx-auto mb-4 text-yellow-600" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Cache Found</h2>
          <p className="text-gray-600 mb-2">Build cache to see it here</p>
          <p className="text-sm text-gray-500 mb-4">Cache is built at .mcp-cache/v1/</p>

          {/* Contract requirement notice */}
          {contractMissing && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
              <strong>Cache requires a contract.</strong>
              <br />
              → Generate Contract first
            </div>
          )}

          {/* Build Cache Button */}
          <button
            onClick={handleBuildCache}
            disabled={!!buildingJob || contractMissing}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {buildingJob ? (
              <>
                <Loader className="animate-spin mr-2" size={16} />
                Building Cache...
              </>
            ) : (
              <>
                <Play className="mr-2" size={16} />
                Build Cache
              </>
            )}
          </button>

          {buildingJob && (
            <p className="mt-3 text-sm text-gray-600">
              This may take a few seconds...
            </p>
          )}

          {jobSuccess && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm flex items-center gap-2">
              <CheckCircle size={16} />
              <span>Cache built successfully!</span>
            </div>
          )}

          {jobError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              {jobError}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Cache</h1>
        <p className="text-gray-600 mt-2">Page detection cache</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Cache Info Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Cache Status</h2>
          </div>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-600">Page Count</dt>
              <dd className="text-2xl font-bold text-gray-900">{cache.pageCount}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Exists</dt>
              <dd className="text-sm font-medium text-green-600">Yes</dd>
            </div>
          </dl>
        </div>

        {/* Drift Indicator Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {cache.binding ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                {cache.binding.match ? (
                  <CheckCircle className="text-green-600" size={24} />
                ) : (
                  <AlertTriangle className="text-orange-600" size={24} />
                )}
                <h2 className="text-xl font-semibold text-gray-900">Contract Binding</h2>
              </div>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-600">Status</dt>
                  <dd className={`text-sm font-medium ${
                    cache.binding.match ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {cache.binding.match ? 'Synchronized' : 'Drift Detected'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Cache SHA256</dt>
                  <dd className="text-xs font-mono text-gray-700 break-all">
                    {cache.binding.contractSha256.substring(0, 16)}...
                  </dd>
                </div>
                {cache.binding.currentContractHash && (
                  <div>
                    <dt className="text-sm text-gray-600">Current Contract SHA256</dt>
                    <dd className="text-xs font-mono text-gray-700 break-all">
                      {cache.binding.currentContractHash.substring(0, 16)}...
                    </dd>
                  </div>
                )}
              </dl>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="text-gray-400" size={24} />
                <h2 className="text-xl font-semibold text-gray-900">Contract Binding</h2>
              </div>
              <p className="text-sm text-gray-600">No binding information available</p>
            </>
          )}
        </div>
      </div>

      {/* Drift Warning */}
      {cache.binding && !cache.binding.match && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-orange-600 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-orange-900 mb-1">Drift Detected</h3>
              <p className="text-sm text-orange-800">
                Cache was built from a different contract version. Rebuild cache to synchronize.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pages List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Cached Pages</h3>
        </div>

        {cache.pages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No cached pages
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Key
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Path
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cache.pages.map((page, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{page.key}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                    {page.path}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Note */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> Drift detection is a simple hash comparison for visibility only.
          Full drift analysis is delegated to integrity gates.
        </p>
      </div>
    </div>
  );
}
