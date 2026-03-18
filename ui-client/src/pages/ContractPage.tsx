import { useState, useEffect } from 'react';
import { useContract } from '../hooks/useContract';
import { FileText, CheckCircle, XCircle, AlertTriangle, Play, Loader } from 'lucide-react';

export function ContractPage() {
  const { data: contract, isLoading, error, refetch } = useContract();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Generate contract job state
  const [generatingJob, setGeneratingJob] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [jobSuccess, setJobSuccess] = useState<boolean>(false);

  // Poll job status
  useEffect(() => {
    if (!generatingJob) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/jobs/${generatingJob}`);
        const data = await response.json();

        if (!data.success) {
          setJobError(data.error || 'Job failed');
          setGeneratingJob(null);
          return;
        }

        const job = data.data;

        if (job.status === 'completed') {
          setGeneratingJob(null);
          setJobError(null);
          setJobSuccess(true);
          refetch(); // Refresh contract data
          // Clear success message after 5 seconds
          setTimeout(() => setJobSuccess(false), 5000);
        } else if (job.status === 'failed') {
          setJobError(job.result?.error || 'Job failed');
          setGeneratingJob(null);
        }
      } catch (err) {
        setJobError(err instanceof Error ? err.message : 'Failed to check job status');
        setGeneratingJob(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [generatingJob, refetch]);

  const handleGenerateContract = async () => {
    setJobError(null);
    setJobSuccess(false);
    try {
      const response = await fetch('http://localhost:3001/api/actions/generate-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await response.json();

      if (!data.success) {
        setJobError(data.error || 'Failed to start contract generation');
        return;
      }

      setGeneratingJob(data.data.jobId);
    } catch (err) {
      setJobError(err instanceof Error ? err.message : 'Failed to start contract generation');
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
          <p className="text-red-800">Failed to load contract: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  if (!contract || !contract.exists) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Contract</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertTriangle className="mx-auto mb-4 text-yellow-600" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Contract Found</h2>
          <p className="text-gray-600 mb-4">Generate a contract to see it here</p>
          <p className="text-sm text-gray-500 mb-4">Contract is generated at .mcp-contract/</p>

          {/* Generate Contract Button */}
          <button
            onClick={handleGenerateContract}
            disabled={!!generatingJob}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {generatingJob ? (
              <>
                <Loader className="animate-spin mr-2" size={16} />
                Generating Contract...
              </>
            ) : (
              <>
                <Play className="mr-2" size={16} />
                Generate Contract
              </>
            )}
          </button>

          {generatingJob && (
            <p className="mt-3 text-sm text-gray-600">
              This may take a few seconds...
            </p>
          )}

          {jobSuccess && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm flex items-center gap-2">
              <CheckCircle size={16} />
              <span>Contract generated successfully!</span>
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

  const selectedFileData = contract.files.find(f => f.name === selectedFile);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Contract</h1>
        <p className="text-gray-600 mt-2">Automation contract specification</p>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {contract.valid ? (
                <CheckCircle className="text-green-600" size={24} />
              ) : (
                <XCircle className="text-red-600" size={24} />
              )}
              <h2 className="text-xl font-semibold text-gray-900">
                {contract.valid ? 'Valid Contract' : 'Invalid Contract'}
              </h2>
            </div>
            {contract.fingerprint && (
              <p className="text-sm text-gray-600 font-mono">{contract.fingerprint}</p>
            )}
            {contract.errors && contract.errors.length > 0 && (
              <div className="mt-2">
                {contract.errors.map((error, i) => (
                  <p key={i} className="text-sm text-red-600">{error}</p>
                ))}
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Files</p>
            <p className="text-2xl font-bold text-gray-900">{contract.files.length}</p>
          </div>
        </div>
      </div>

      {/* File Viewer */}
      {contract.files.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No contract files found
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* File List */}
          <div className="col-span-3 bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Files</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {contract.files.map((file) => (
                <button
                  key={file.name}
                  onClick={() => setSelectedFile(file.name)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                    selectedFile === file.name ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* File Content */}
          <div className="col-span-9 bg-white rounded-lg border border-gray-200 overflow-hidden">
            {selectedFileData ? (
              <div>
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">{selectedFileData.name}</h3>
                </div>
                <div className="p-4">
                  <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(selectedFileData.content, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96 text-gray-500">
                Select a file to view its content
              </div>
            )}
          </div>
        </div>
      )}

      {/* Note */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> Contract validation is delegated to integrity gates.
          This page shows the contract files as-is for visibility only.
        </p>
      </div>
    </div>
  );
}
