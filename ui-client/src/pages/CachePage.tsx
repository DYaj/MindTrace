import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useCache } from '../hooks/useCache';
import { useContract } from '../hooks/useContract';
import { useIntegrity } from '../hooks/useIntegrity';
import { AlertTriangle, CheckCircle, Database, FileText, Play, GitBranch, Link as LinkIcon, ArrowRight, Shield } from 'lucide-react';
import { FileViewerModal } from '../components/FileViewerModal';
import { JobStatusCard } from '../components/JobStatusCard';
import InfoTooltip from '../components/InfoTooltip';
import type { JobStatus } from '@breakline/ui-types';

const STORAGE_KEY = 'breakline:cache:currentJobId';
const TIMESTAMP_KEY = 'breakline:cache:currentJobId:timestamp';
const JOB_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export function CachePage() {
  const queryClient = useQueryClient();
  const { data: cache, isLoading, error, refetch } = useCache();
  const { data: contract } = useContract();
  const { data: integrity } = useIntegrity();

  // Build cache job state (persisted in sessionStorage, with expiry check)
  const [currentJobId, setCurrentJobId] = useState<string | null>(() => {
    const jobId = sessionStorage.getItem(STORAGE_KEY);
    const timestamp = sessionStorage.getItem(TIMESTAMP_KEY);

    if (jobId && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);
      if (age < JOB_EXPIRY_MS) {
        return jobId; // Job is fresh, use it
      }
      // Job is stale, clear it
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(TIMESTAMP_KEY);
    }
    return null;
  });

  // Track recently completed job for success message
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Persist currentJobId to sessionStorage with timestamp
  useEffect(() => {
    if (currentJobId) {
      sessionStorage.setItem(STORAGE_KEY, currentJobId);
      sessionStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(TIMESTAMP_KEY);
    }
  }, [currentJobId]);

  // Cache page viewer state
  const [selectedPage, setSelectedPage] = useState<{ key: string; content: string } | null>(null);

  const handlePageClick = async (pageKey: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/cache/pages/${pageKey}`);
      const data = await response.json();

      if (data.success) {
        setSelectedPage({
          key: pageKey,
          content: data.data.content
        });
      }
    } catch (err) {
      console.error('Failed to load cache page:', err);
    }
  };

  const handleBuildCache = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/actions/build-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await response.json();

      if (data.success && data.data.jobId) {
        const jobId = data.data.jobId;
        setCurrentJobId(jobId);
        sessionStorage.setItem(STORAGE_KEY, jobId);
      }
    } catch (err) {
      console.error('Failed to start cache build:', err);
    }
  };

  const handleJobComplete = (job: JobStatus) => {
    if (job.status === 'completed') {
      // Refresh cache data after successful build
      refetch();
      // Invalidate integrity query so it refetches when user navigates to Integrity page
      queryClient.invalidateQueries({ queryKey: ['integrity'] });
      // Show success message with link to verify integrity
      setShowSuccessMessage(true);
      // Hide JobStatusCard immediately on success (replaced by success message)
      setCurrentJobId(null);
      sessionStorage.removeItem(STORAGE_KEY);
      // Hide success message after 60 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 60000);
    } else if (job.status === 'failed') {
      // Keep job visible for 30 seconds on failure
      setTimeout(() => {
        setCurrentJobId(null);
        sessionStorage.removeItem(STORAGE_KEY);
      }, 30000);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6" data-testid="cache-page-loading">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6" data-testid="cache-page-error">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load cache: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  if (!cache || !cache.exists) {
    const contractMissing = !contract || !contract.exists;

    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6" data-testid="cache-page">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900" data-testid="cache-page-title">Cache</h1>
          <InfoTooltip
            title="What is the Cache?"
            content={
              <div className="space-y-3">
                <p>The cache stores page detection results from your application. It's generated from your contract and bound to a specific contract version. Tests use this cache to know which pages to run against.</p>
                <div className="flex items-start gap-2 pt-2 border-t border-white/10">
                  <LinkIcon size={16} className="flex-shrink-0 mt-0.5" />
                  <p className="text-sm">Always bound to a contract fingerprint. Rebuild when contract changes.</p>
                </div>
              </div>
            }
            icon={Database}
          />
        </div>
        <p className="text-sm sm:text-base text-gray-600 mb-6">Page detection cache derived from your contract</p>

        {/* Contract requirement notice */}
        {contractMissing ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <AlertTriangle className="mx-auto mb-4 text-yellow-600" size={48} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Contract Required</h2>
            <p className="text-gray-600 mb-4">Generate a contract before building cache</p>
            <div className="inline-block px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
              Cache is contract-derived → Generate Contract first
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center" data-testid="cache-empty-state">
            <Database className="mx-auto mb-4 text-yellow-600" size={48} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Cache Found</h2>
            <p className="text-gray-600 mb-4">Build cache to detect pages from your contract</p>
            <p className="text-xs text-gray-500 mb-4">Built at .mcp-cache/v1/</p>

            {/* Build Cache Button */}
            <button
              data-testid="cache-button-build"
              onClick={handleBuildCache}
              disabled={!!currentJobId}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="mr-2" size={16} />
              Build Cache
            </button>

            {/* Job Status */}
            {currentJobId && (
              <div className="mt-4">
                <JobStatusCard jobId={currentJobId} onComplete={handleJobComplete} />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const hasDrift = cache.binding && !cache.binding.match;
  const hasCacheIssues = integrity && (
    integrity.cacheGate.status === 'warning' ||
    integrity.cacheGate.status === 'invalid'
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6" data-testid="cache-page">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900" data-testid="cache-page-title">Cache</h1>
            <InfoTooltip
              title="What is the Cache?"
              content={
                <div className="space-y-3">
                  <p>The cache stores page detection results from your application. It's generated from your contract and bound to a specific contract version. Tests use this cache to know which pages to run against.</p>
                  <div className="flex items-start gap-2 pt-2 border-t border-white/10">
                    <LinkIcon size={16} className="flex-shrink-0 mt-0.5" />
                    <p className="text-sm">Always bound to a contract fingerprint. Rebuild when contract changes.</p>
                  </div>
                </div>
              }
              icon={Database}
            />
          </div>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Page detection cache derived from your contract</p>
        </div>
        {hasCacheIssues && (
          <button
            data-testid="cache-button-rebuild"
            onClick={handleBuildCache}
            disabled={!!currentJobId}
            className={`flex-shrink-0 inline-flex items-center px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium ${
              integrity?.cacheGate.status === 'invalid'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            <Play className="mr-2" size={16} />
            Rebuild Cache
          </button>
        )}
      </div>

      {/* Job Status */}
      {currentJobId && (
        <JobStatusCard jobId={currentJobId} onComplete={handleJobComplete} />
      )}

      {/* Success Message - Verify Integrity */}
      {showSuccessMessage && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6" data-testid="cache-rebuild-success">
          <div className="flex items-start gap-4">
            <CheckCircle className="text-green-600 flex-shrink-0" size={32} />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-900 mb-2">Cache Rebuilt Successfully</h3>
              <p className="text-sm text-green-800 mb-4">
                Your cache has been rebuilt. Verify that the Cache Integrity Gate now passes.
              </p>
              <Link
                to="/integrity"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                data-testid="cache-check-integrity-link"
              >
                <Shield size={16} />
                Check Integrity Gates
                <ArrowRight size={16} />
              </Link>
            </div>
            <button
              onClick={() => setShowSuccessMessage(false)}
              className="text-green-600 hover:text-green-800 transition-colors"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Drift Warning (prominent if detected) */}
      {hasDrift && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6" data-testid="cache-drift-warning">
          <div className="flex items-start gap-4">
            <AlertTriangle className="text-orange-600 flex-shrink-0" size={32} />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-orange-900 mb-2">Drift Detected</h3>
              <p className="text-sm text-orange-800 mb-4">
                Your cache was built from an older contract version. The contract has changed since the cache was created.
                Tests may not run correctly until you rebuild the cache.
              </p>
              <button
                onClick={handleBuildCache}
                disabled={!!currentJobId}
                className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                <Play className="mr-2" size={16} />
                Rebuild Cache Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cache Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Existence & Pages */}
        <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Database className="text-blue-600" size={24} />
              <h2 className="text-lg font-semibold text-gray-900">Cache Status</h2>
            </div>
          </div>
          <div className="px-6 py-4">
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-600 mb-1">Existence</dt>
                <dd className="flex items-center gap-2">
                  <CheckCircle className="text-green-600" size={18} />
                  <span className="text-sm font-semibold text-green-600">Cache Built</span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600 mb-1">Pages Detected</dt>
                <dd className="text-3xl font-bold text-gray-900">{cache.pageCount}</dd>
                <p className="text-xs text-gray-500 mt-1">Pages available for testing</p>
              </div>
            </dl>
          </div>
        </div>

        {/* Contract Binding & Drift */}
        <div className={`rounded-lg border-2 overflow-hidden ${
          hasDrift ? 'border-orange-200' : 'border-green-200'
        }`}>
          <div className={`px-6 py-4 border-b ${
            hasDrift ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center gap-3">
              {hasDrift ? (
                <GitBranch className="text-orange-600" size={24} />
              ) : (
                <CheckCircle className="text-green-600" size={24} />
              )}
              <h2 className="text-lg font-semibold text-gray-900">Contract Binding</h2>
            </div>
          </div>
          <div className="px-6 py-4 bg-white">
            {cache.binding ? (
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-600 mb-1">Synchronization</dt>
                  <dd className="flex items-center gap-2">
                    {cache.binding.match ? (
                      <>
                        <CheckCircle className="text-green-600" size={18} />
                        <span className="text-sm font-semibold text-green-600">Synchronized</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="text-orange-600" size={18} />
                        <span className="text-sm font-semibold text-orange-600">Drift Detected</span>
                      </>
                    )}
                  </dd>
                  <p className="text-xs text-gray-500 mt-1">
                    {cache.binding.match ? 'Cache matches current contract' : 'Cache needs rebuild'}
                  </p>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600 mb-2">Fingerprints</dt>
                  <dd className="space-y-2">
                    <div className="bg-gray-50 rounded px-3 py-2 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Cache Binding</p>
                      <p className="text-xs font-mono text-gray-700 break-all">
                        {cache.binding.contractSha256}
                      </p>
                    </div>
                    {cache.binding.currentContractHash && (
                      <div className="bg-gray-50 rounded px-3 py-2 border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Current Contract</p>
                        <p className="text-xs font-mono text-gray-700 break-all">
                          {cache.binding.currentContractHash}
                        </p>
                      </div>
                    )}
                  </dd>
                </div>
              </dl>
            ) : (
              <div className="text-sm text-gray-600">
                No binding information available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cached Pages Section */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Detected Pages</h2>
          <p className="text-sm text-gray-600 mt-1">
            Pages discovered from your application and available for testing
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" data-testid="cache-pages-list">
          {cache.pages.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FileText className="mx-auto mb-2 text-gray-400" size={48} />
              <p>No pages detected</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Page Key
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Route Path
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cache.pages.map((page, index) => (
                    <tr
                      key={index}
                      data-testid={`cache-page-item-${page.key}`}
                      onClick={() => handlePageClick(page.key)}
                      className="hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-blue-600" />
                          <span className="text-sm font-medium text-gray-900">{page.key}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-gray-600">{page.path}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Cache Page Viewer Modal */}
      {selectedPage && (
        <FileViewerModal
          isOpen={true}
          onClose={() => setSelectedPage(null)}
          fileName={`${selectedPage.key}.json`}
          content={selectedPage.content}
          fileType="json"
        />
      )}
    </div>
  );
}
