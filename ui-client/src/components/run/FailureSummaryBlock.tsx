import { AlertTriangle, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';

interface FailureSummaryBlockProps {
  runId: string;
  exitCode: number;
  testsFailed: number;
  testsPassed: number;
}

interface NormalizedResults {
  tests: Array<{
    title: string;
    status: 'passed' | 'failed' | 'skipped';
    error?: string;
  }>;
}

export function FailureSummaryBlock({
  runId,
  exitCode,
  testsFailed
}: FailureSummaryBlockProps) {
  const [failedTests, setFailedTests] = useState<string[]>([]);

  // Only show when there's a failure
  if (exitCode === 0 && testsFailed === 0) {
    return null;
  }

  // Fetch normalized-results.json to extract failed test names
  useEffect(() => {
    if (testsFailed > 0) {
      fetch(`http://localhost:3001/api/runs/${runId}/artifacts/runtime/normalized-results.json`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const content = JSON.parse(data.data.content) as NormalizedResults;
            const failed = content.tests
              ?.filter(t => t.status === 'failed')
              ?.slice(0, 5) // Show top 5 only
              ?.map(t => t.title) || [];
            setFailedTests(failed);
          }
        })
        .catch(() => {
          // If we can't load test details, just show generic message
          setFailedTests([]);
        });
    }
  }, [runId, testsFailed]);

  const hasMoreFailures = testsFailed > 5;
  const remainingCount = testsFailed - 5;

  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6" data-testid="failure-summary-block">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <AlertTriangle className="text-red-600" size={32} />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-red-900 mb-2">Failure Summary</h2>

          {failedTests.length > 0 ? (
            <>
              <p className="text-sm text-red-800 mb-3">
                {testsFailed} test{testsFailed !== 1 ? 's' : ''} failed
              </p>
              <ul className="space-y-1 mb-4">
                {failedTests.map((title, index) => (
                  <li key={index} className="text-sm text-red-800 flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">•</span>
                    <span>{title}</span>
                  </li>
                ))}
                {hasMoreFailures && (
                  <li className="text-sm text-red-700 italic flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">•</span>
                    <span>and {remainingCount} more...</span>
                  </li>
                )}
              </ul>
            </>
          ) : (
            <p className="text-sm text-red-800 mb-4">
              Exit code: {exitCode} — See artifacts below for details
            </p>
          )}

          <a
            href="#artifacts"
            className="inline-flex items-center gap-1 text-sm font-medium text-red-700 hover:text-red-900 transition-colors"
          >
            View Full Artifacts
            <ChevronDown size={16} />
          </a>
        </div>
      </div>
    </div>
  );
}
