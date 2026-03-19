import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useRunDetail } from '../hooks/useRunDetail';
import { ArrowLeft, FileText, Activity } from 'lucide-react';
import { FileViewerModal } from '../components/FileViewerModal';

type TabType = 'overview' | 'artifacts' | 'audit';

export function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedArtifact, setSelectedArtifact] = useState<{ name: string; path: string; type: 'json' | 'txt' | 'other'; content: string } | null>(null);

  const { data: run, isLoading, error } = useRunDetail(runId || '');

  const handleArtifactClick = async (artifactPath: string, name: string, type: 'json' | 'txt' | 'other') => {
    try {
      const response = await fetch(`http://localhost:3001/api/runs/${runId}/artifacts/${artifactPath}`);
      const data = await response.json();

      if (data.success) {
        setSelectedArtifact({
          name,
          path: artifactPath,
          type,
          content: data.data.content
        });
      }
    } catch (error) {
      console.error('Failed to load artifact:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm sm:text-base text-red-800">Failed to load run details: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  const exitCodeColors = {
    0: 'bg-green-100 text-green-800',
    1: 'bg-red-100 text-red-800',
    2: 'bg-orange-100 text-orange-800',
    3: 'bg-red-100 text-red-900 font-bold'
  } as const;

  const exitCodeLabels = {
    0: 'Success',
    1: 'Test Failure',
    2: 'Infrastructure',
    3: 'Policy Violation'
  } as const;

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <button
          onClick={() => navigate('/runs')}
          className="flex items-center gap-2 text-sm sm:text-base text-gray-600 hover:text-gray-900 mb-3 sm:mb-4"
        >
          <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
          <span>Back to Runs</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{run.runName}</h1>
            <p className="text-sm sm:text-base text-gray-600">{new Date(run.timestamp).toLocaleString()}</p>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${exitCodeColors[run.exitCode]} self-start sm:self-auto`}>
            {exitCodeLabels[run.exitCode]}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4 sm:mb-6" data-testid="run-detail-tabs">
        <nav className="flex gap-2 sm:gap-4 overflow-x-auto">
          <button
            data-testid="run-detail-tab-overview"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 border-b-2 font-medium ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            data-testid="run-detail-tab-artifacts"
            onClick={() => setActiveTab('artifacts')}
            className={`px-4 py-2 border-b-2 font-medium ${
              activeTab === 'artifacts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Artifacts ({run.artifacts.length})
          </button>
          <button
            data-testid="run-detail-tab-audit"
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 border-b-2 font-medium ${
              activeTab === 'audit'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Audit ({run.auditEvents.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 gap-6" data-testid="run-detail-overview">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Test Results</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-600">Tests Passed</dt>
                <dd className="text-2xl font-bold text-green-600">{run.testsPassed}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Tests Failed</dt>
                <dd className="text-2xl font-bold text-red-600">{run.testsFailed}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Duration</dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {(run.duration / 1000).toFixed(2)}s
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Run Info</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-600">Run ID</dt>
                <dd className="text-sm font-mono text-gray-900">{run.runId}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Exit Code</dt>
                <dd className="text-sm font-mono text-gray-900">{run.exitCode}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Artifacts</dt>
                <dd className="text-sm text-gray-900">{run.artifacts.length} files</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Audit Events</dt>
                <dd className="text-sm text-gray-900">{run.auditEvents.length} events</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'artifacts' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" data-testid="run-detail-artifacts">
          {run.artifacts.length === 0 ? (
            <div className="p-8 text-center text-gray-500" data-testid="run-detail-artifacts-empty">
              No artifacts found for this run
            </div>
          ) : (
            <table className="w-full" data-testid="run-detail-artifacts-table">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Path
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {run.artifacts.map((artifact, index) => (
                  <tr
                    key={index}
                    data-testid={`run-detail-artifact-${artifact.name}`}
                    onClick={() => handleArtifactClick(artifact.path, artifact.name, artifact.type)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{artifact.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 font-mono">{artifact.path}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                        {artifact.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {(artifact.size / 1024).toFixed(2)} KB
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white rounded-lg border border-gray-200" data-testid="run-detail-audit">
          {run.auditEvents.length === 0 ? (
            <div className="p-8 text-center text-gray-500" data-testid="run-detail-audit-empty">
              No audit events found for this run
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {run.auditEvents.map((event, index) => (
                <div key={index} data-testid={`run-detail-audit-event-${index}`} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <Activity size={16} className="text-gray-400 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-medium text-gray-900">{event.type}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{event.message}</p>
                      {event.details && Object.keys(event.details).length > 0 && (
                        <pre className="mt-2 text-xs bg-gray-50 p-2 rounded font-mono text-gray-600 overflow-x-auto">
                          {JSON.stringify(event.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* File Viewer Modal */}
      {selectedArtifact && (
        <FileViewerModal
          isOpen={true}
          onClose={() => setSelectedArtifact(null)}
          fileName={selectedArtifact.name}
          content={selectedArtifact.content}
          fileType={selectedArtifact.type}
        />
      )}
    </div>
  );
}
