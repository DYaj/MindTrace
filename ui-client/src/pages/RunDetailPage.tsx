import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useRunDetail } from '../hooks/useRunDetail';
import { ArrowLeft, RefreshCw, FileX, Activity } from 'lucide-react';
import { FileViewerModal } from '../components/FileViewerModal';
import { RunSummaryHeader } from '../components/run/RunSummaryHeader';
import { FailureSummaryBlock } from '../components/run/FailureSummaryBlock';
import { ArtifactGroup, categorizeArtifacts } from '../components/run/ArtifactGroup';
import { AuditEventItem } from '../components/run/AuditEventItem';

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
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <FileX size={20} className="text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-red-900 mb-1">Failed to Load Run Details</h3>
              <p className="text-sm text-red-800 mb-4">
                {error instanceof Error ? error.message : 'An unknown error occurred while loading this run.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  <RefreshCw size={16} />
                  Retry
                </button>
                <button
                  onClick={() => navigate('/runs')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                >
                  <ArrowLeft size={16} />
                  Back to Runs
                </button>
              </div>
            </div>
          </div>
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

      {/* Summary Header */}
      <RunSummaryHeader
        runId={run.runId}
        exitCode={run.exitCode}
        duration={run.duration}
        testsPassed={run.testsPassed}
        testsFailed={run.testsFailed}
      />

      {/* Failure Summary Block */}
      <div className="mt-6">
        <FailureSummaryBlock
          runId={run.runId}
          exitCode={run.exitCode}
          testsFailed={run.testsFailed}
          testsPassed={run.testsPassed}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4 sm:mb-6 mt-6" data-testid="run-detail-tabs">
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
        <div className="space-y-4" data-testid="run-detail-artifacts">
          {run.artifacts.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center" data-testid="run-detail-artifacts-empty">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                  <FileX size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">No Artifacts</h3>
                <p className="text-sm text-gray-600 max-w-md">
                  This run produced no saved artifacts (reports, screenshots, traces, or logs).
                </p>
              </div>
            </div>
          ) : (() => {
            const grouped = categorizeArtifacts(run.artifacts);
            return (
              <>
                <ArtifactGroup
                  title="Core Artifacts"
                  description="Primary test artifacts and results"
                  artifacts={grouped.core}
                  category="core"
                  onArtifactClick={handleArtifactClick}
                />
                <ArtifactGroup
                  title="Integrity Artifacts"
                  description="Contract validation and policy checks"
                  artifacts={grouped.integrity}
                  category="integrity"
                  onArtifactClick={handleArtifactClick}
                />
                <ArtifactGroup
                  title="Healing Artifacts"
                  description="Self-healing and recovery data"
                  artifacts={grouped.healing}
                  category="healing"
                  onArtifactClick={handleArtifactClick}
                />
                <ArtifactGroup
                  title="Debug Artifacts"
                  description="Logs, traces, and debugging information"
                  artifacts={grouped.debug}
                  category="debug"
                  onArtifactClick={handleArtifactClick}
                />
              </>
            );
          })()}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" data-testid="run-detail-audit">
          {run.auditEvents.length === 0 ? (
            <div className="p-12 text-center" data-testid="run-detail-audit-empty">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                  <Activity size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">No Audit Events</h3>
                <p className="text-sm text-gray-600 max-w-md">
                  No audit events were recorded during this run.
                </p>
              </div>
            </div>
          ) : (
            <div>
              {run.auditEvents.map((event, index) => (
                <AuditEventItem
                  key={index}
                  event={event}
                  index={index}
                  isLast={index === run.auditEvents.length - 1}
                />
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
