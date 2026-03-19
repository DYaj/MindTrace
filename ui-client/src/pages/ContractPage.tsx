import { useState, useEffect } from 'react';
import { useContract } from '../hooks/useContract';
import { FileText, CheckCircle, XCircle, AlertTriangle, Play, FileCode, Shield } from 'lucide-react';
import { JobStatusCard } from '../components/JobStatusCard';
import type { JobStatus } from '@breakline/ui-types';

const STORAGE_KEY = 'breakline:contract:currentJobId';

export function ContractPage() {
  const { data: contract, isLoading, error, refetch } = useContract();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Generate contract job state (persisted in sessionStorage)
  const [currentJobId, setCurrentJobId] = useState<string | null>(() => {
    return sessionStorage.getItem(STORAGE_KEY);
  });

  // Persist currentJobId to sessionStorage
  useEffect(() => {
    if (currentJobId) {
      sessionStorage.setItem(STORAGE_KEY, currentJobId);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [currentJobId]);

  const handleGenerateContract = async () => {
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
    }
    // Keep job visible for 30 seconds after completion, then clear
    if (job.status === 'completed' || job.status === 'failed') {
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2" data-testid="contract-page-title">Contract</h1>
        <p className="text-sm sm:text-base text-gray-600 mb-6">Your automation specification and test scope definition</p>

        {/* What is this? */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">What is the Contract?</h3>
          <p className="text-sm text-blue-800">
            The contract defines what your test automation should do. It specifies which pages to test, what actions to perform, and the expected behavior.
            Generate a contract to start testing.
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center" data-testid="contract-empty-state">
          <AlertTriangle className="mx-auto mb-4 text-yellow-600" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Contract Found</h2>
          <p className="text-gray-600 mb-4">Generate your first contract to begin</p>
          <p className="text-xs text-gray-500 mb-4">Generated at .mcp-contract/</p>

          {/* Generate Contract Button */}
          <button
            data-testid="contract-button-generate"
            onClick={handleGenerateContract}
            disabled={!!currentJobId}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="mr-2" size={16} />
            Generate Contract
          </button>

          {/* Job Status */}
          {currentJobId && (
            <div className="mt-4">
              <JobStatusCard jobId={currentJobId} onComplete={handleJobComplete} />
            </div>
          )}
        </div>
      </div>
    );
  }

  const selectedFileData = contract.files.find(f => f.name === selectedFile);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6" data-testid="contract-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900" data-testid="contract-page-title">Contract</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Your automation specification and test scope definition</p>
      </div>

      {/* Summary Section */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-lg border border-blue-200">
            <FileCode className="text-blue-600" size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">What is the Contract?</h2>
            <p className="text-sm text-gray-700 mb-3">
              The contract is your test automation's source of truth. It defines which pages to test, what actions to perform, and expected outcomes.
              All test runs and cache builds reference this contract.
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Shield size={14} />
              <span>Cache and runs validate against this contract via fingerprint matching</span>
            </div>
          </div>
        </div>
      </div>

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
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      selectedFile === file.name ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={16} className={selectedFile === file.name ? 'text-blue-600' : 'text-gray-400'} />
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
    </div>
  );
}
