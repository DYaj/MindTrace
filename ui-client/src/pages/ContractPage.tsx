import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useContract } from '../hooks/useContract';
import { FileText, CheckCircle, XCircle, AlertTriangle, Play, FileCode, Shield, ArrowRight } from 'lucide-react';
import { JobStatusCard } from '../components/JobStatusCard';
import { CompatibilityCheckModal } from '../components/CompatibilityCheckModal';
import InfoTooltip from '../components/InfoTooltip';
import type { JobStatus } from '@breakline/ui-types';

interface CompatibilityResult {
  compatible: boolean;
  level: 'full' | 'partial' | 'unsupported';
  checks: {
    playwrightConfig: boolean;
    testFiles: boolean;
    pagePatterns: boolean;
  };
  details: {
    configFile?: string;
    testFileCount: number;
    pageCount: number;
    message: string;
  };
}

const STORAGE_KEY = 'breakline:contract:currentJobId';
const TIMESTAMP_KEY = 'breakline:contract:currentJobId:timestamp';
const JOB_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export function ContractPage() {
  const queryClient = useQueryClient();
  const { data: contract, isLoading, error, refetch } = useContract();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Compatibility check modal state
  const [showCompatibilityModal, setShowCompatibilityModal] = useState(false);
  const [compatibilityResult, setCompatibilityResult] = useState<CompatibilityResult | null>(null);
  const [isCheckingCompatibility, setIsCheckingCompatibility] = useState(false);

  // Generate contract job state (persisted in sessionStorage, with expiry check)
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

  const handleCheckCompatibility = async () => {
    console.log('Starting compatibility check...');
    setShowCompatibilityModal(true);
    setIsCheckingCompatibility(true);
    setCompatibilityResult(null);

    try {
      console.log('Fetching from:', 'http://localhost:3001/api/actions/check-compatibility');
      const response = await fetch('http://localhost:3001/api/actions/check-compatibility');
      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        setCompatibilityResult(data.data);
      } else {
        console.error('API returned error:', data.error);
        setCompatibilityResult({
          compatible: false,
          level: 'unsupported',
          checks: {
            playwrightConfig: false,
            testFiles: false,
            pagePatterns: false
          },
          details: {
            testFileCount: 0,
            pageCount: 0,
            message: data.error || 'Failed to check repository compatibility. Please try again.'
          }
        });
      }
    } catch (err) {
      console.error('Failed to check compatibility:', err);
      // Show error in modal
      setCompatibilityResult({
        compatible: false,
        level: 'unsupported',
        checks: {
          playwrightConfig: false,
          testFiles: false,
          pagePatterns: false
        },
        details: {
          testFileCount: 0,
          pageCount: 0,
          message: `Network error: ${err instanceof Error ? err.message : 'Server not responding'}. Make sure ui-server is running.`
        }
      });
    } finally {
      setIsCheckingCompatibility(false);
    }
  };

  const handleProceedWithGeneration = async () => {
    setShowCompatibilityModal(false);

    try {
      const response = await fetch('http://localhost:3001/api/actions/generate-contract', {
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
      console.error('Failed to start contract generation:', err);
    }
  };

  const handleJobComplete = (job: JobStatus) => {
    if (job.status === 'completed') {
      // Refresh contract data after successful generation
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
      <div className="max-w-7xl mx-auto p-4 sm:p-6" data-testid="contract-page-loading">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6" data-testid="contract-page-error">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load contract: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  if (!contract || !contract.exists) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6" data-testid="contract-page">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900" data-testid="contract-page-title">Contract</h1>
          <InfoTooltip
            title="What is the Contract?"
            content={
              <div className="space-y-3">
                <p>The contract is your test automation's source of truth. It defines which pages to test, what actions to perform, and expected outcomes. All test runs and cache builds reference this contract.</p>
                <div className="flex items-start gap-2 pt-2 border-t border-white/10">
                  <Shield size={16} className="flex-shrink-0 mt-0.5" />
                  <p className="text-sm">Cache and runs validate against this contract via fingerprint matching.</p>
                </div>
              </div>
            }
            icon={FileCode}
          />
        </div>
        <p className="text-sm sm:text-base text-gray-600 mb-6">Your automation specification and test scope definition</p>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center" data-testid="contract-empty-state">
          <AlertTriangle className="mx-auto mb-4 text-yellow-600" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Contract Found</h2>
          <p className="text-gray-600 mb-4">Generate your first contract to begin</p>
          <p className="text-xs text-gray-500 mb-4">Generated at .mcp-contract/</p>

          {/* Generate Contract Button */}
          <button
            data-testid="contract-button-generate"
            onClick={handleCheckCompatibility}
            disabled={!!currentJobId || isCheckingCompatibility}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCheckingCompatibility ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Checking Compatibility...
              </>
            ) : (
              <>
                <Play className="mr-2" size={16} />
                Generate Contract
              </>
            )}
          </button>

          {/* Job Status */}
          {currentJobId && (
            <div className="mt-4">
              <JobStatusCard jobId={currentJobId} onComplete={handleJobComplete} />
            </div>
          )}

          {/* Success Message - Verify Integrity */}
          {showSuccessMessage && (
            <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="text-green-600 flex-shrink-0" size={32} />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">Contract Generated Successfully</h3>
                  <p className="text-sm text-green-800 mb-4">
                    Your contract has been generated. Verify that the Contract Integrity Gate now passes.
                  </p>
                  <Link
                    to="/integrity"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
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
        </div>

        {/* Compatibility Check Modal */}
        <CompatibilityCheckModal
          isOpen={showCompatibilityModal}
          onClose={() => setShowCompatibilityModal(false)}
          onProceed={handleProceedWithGeneration}
          result={compatibilityResult}
          isLoading={isCheckingCompatibility}
        />
      </div>
    );
  }

  const selectedFileData = contract.files.find(f => f.name === selectedFile);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6" data-testid="contract-page">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900" data-testid="contract-page-title">Contract</h1>
          <InfoTooltip
            title="What is the Contract?"
            content={
              <div className="space-y-3">
                <p>The contract is your test automation's source of truth. It defines which pages to test, what actions to perform, and expected outcomes. All test runs and cache builds reference this contract.</p>
                <div className="flex items-start gap-2 pt-2 border-t border-white/10">
                  <Shield size={16} className="flex-shrink-0 mt-0.5" />
                  <p className="text-sm">Cache and runs validate against this contract via fingerprint matching.</p>
                </div>
              </div>
            }
            icon={FileCode}
          />
        </div>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Your automation specification and test scope definition</p>
      </div>

      {/* Success Message - Verify Integrity (shown after contract exists) */}
      {showSuccessMessage && contract.exists && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <CheckCircle className="text-green-600 flex-shrink-0" size={32} />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-900 mb-2">Contract Generated Successfully</h3>
              <p className="text-sm text-green-800 mb-4">
                Your contract has been generated. Next step: build the cache.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/cache"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Build Cache
                  <ArrowRight size={16} />
                </Link>
                <Link
                  to="/integrity"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-green-600 text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
                >
                  <Shield size={16} />
                  Check Integrity
                </Link>
              </div>
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

      {/* Validation Status Card */}
      <div className={`rounded-lg border-2 overflow-hidden ${
        contract.valid ? 'border-green-200' : 'border-red-200'
      }`} data-testid="contract-status-card">
        <div className={`px-6 py-4 ${contract.valid ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {contract.valid ? (
                <CheckCircle className="text-green-600 flex-shrink-0" size={28} />
              ) : (
                <XCircle className="text-red-600 flex-shrink-0" size={28} />
              )}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {contract.valid ? 'Valid Contract' : 'Invalid Contract'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {contract.valid ? 'Structure and fields validated' : 'Validation errors detected'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600 uppercase">Files</p>
              <p className="text-2xl font-bold text-gray-900">{contract.files.length}</p>
            </div>
          </div>
        </div>

        {/* Fingerprint Section */}
        {contract.fingerprint && (
          <div className="px-6 py-4 bg-white border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Contract Fingerprint</h3>
            <div className="bg-gray-50 rounded px-3 py-2 border border-gray-200">
              <p className="text-xs font-mono text-gray-700 break-all">{contract.fingerprint}</p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              This unique hash identifies your contract version. Cache and runs must match this fingerprint.
            </p>
          </div>
        )}

        {/* Errors Section */}
        {contract.errors && contract.errors.length > 0 && (
          <div className="px-6 py-4 bg-red-50 border-t border-red-200">
            <h3 className="text-sm font-semibold text-red-900 mb-2">Validation Errors</h3>
            <ul className="space-y-1">
              {contract.errors.map((error, i) => (
                <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Contract Files Section */}
      {contract.files.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500" data-testid="contract-no-files">
          <FileText className="mx-auto mb-2 text-gray-400" size={48} />
          <p>No contract files found</p>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Contract Files</h2>
            <p className="text-sm text-gray-600 mt-1">
              JSON files that define your test automation specification
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* File List */}
            <div className="lg:col-span-4 bg-white rounded-lg border border-gray-200 overflow-hidden" data-testid="contract-file-list">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Files ({contract.files.length})</h3>
              </div>
              <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                {contract.files.map((file) => (
                  <button
                    key={file.name}
                    data-testid={`contract-file-item-${file.name}`}
                    onClick={() => setSelectedFile(file.name)}
                    className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-l-4 ${
                      selectedFile === file.name ? 'bg-blue-50 border-blue-600' : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={16} className={selectedFile === file.name ? 'text-blue-900' : 'text-blue-600'} />
                      <span className={`text-sm font-medium ${
                        selectedFile === file.name ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {file.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* File Content Viewer */}
            <div className="lg:col-span-8 bg-white rounded-lg border border-gray-200 overflow-hidden" data-testid="contract-file-viewer">
              {selectedFileData ? (
                <>
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{selectedFileData.name}</h3>
                      <span className="text-xs text-gray-500">JSON</span>
                    </div>
                  </div>
                  <div className="p-4 max-h-[600px] overflow-auto">
                    <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(selectedFileData.content, null, 2)}
                    </pre>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[400px] text-gray-500">
                  <div className="text-center">
                    <FileText className="mx-auto mb-2 text-gray-400" size={48} />
                    <p className="text-sm">Select a file to view its content</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compatibility Check Modal */}
      <CompatibilityCheckModal
        isOpen={showCompatibilityModal}
        onClose={() => setShowCompatibilityModal(false)}
        onProceed={handleProceedWithGeneration}
        result={compatibilityResult}
        isLoading={isCheckingCompatibility}
      />
    </div>
  );
}
