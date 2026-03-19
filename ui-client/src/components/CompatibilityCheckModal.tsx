import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, Play, FileCode, TestTube, Layers } from 'lucide-react';

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

interface CompatibilityCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  result: CompatibilityResult | null;
  isLoading: boolean;
}

export function CompatibilityCheckModal({ isOpen, onClose, onProceed, result, isLoading }: CompatibilityCheckModalProps) {
  console.log('CompatibilityCheckModal render:', { isOpen, isLoading, hasResult: !!result, result });

  if (!isOpen) {
    console.log('Modal not open, returning null');
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          {/* Header */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Repository Compatibility Check</h2>
          <p className="text-sm text-gray-600 mb-6">
            Verifying that your repository structure is compatible with Breakline
          </p>

          {/* Loading State */}
          {isLoading && (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Analyzing repository structure...</p>
            </div>
          )}

          {/* Results */}
          {!isLoading && result && (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className={`rounded-lg border-2 p-4 ${
                result.level === 'full'
                  ? 'bg-green-50 border-green-200'
                  : result.level === 'partial'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start gap-3">
                  {result.level === 'full' && <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={24} />}
                  {result.level === 'partial' && <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={24} />}
                  {result.level === 'unsupported' && <XCircle className="text-red-600 flex-shrink-0 mt-0.5" size={24} />}
                  <div className="flex-1">
                    <h3 className={`font-semibold mb-1 ${
                      result.level === 'full'
                        ? 'text-green-900'
                        : result.level === 'partial'
                        ? 'text-yellow-900'
                        : 'text-red-900'
                    }`}>
                      {result.level === 'full' && 'Full Support'}
                      {result.level === 'partial' && 'Partial Support'}
                      {result.level === 'unsupported' && 'Unsupported'}
                    </h3>
                    <p className={`text-sm ${
                      result.level === 'full'
                        ? 'text-green-800'
                        : result.level === 'partial'
                        ? 'text-yellow-800'
                        : 'text-red-800'
                    }`}>
                      {result.details.message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Check Details */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Detection Results</h4>

                {/* Playwright Config Check */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  {result.checks.playwrightConfig ? (
                    <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
                  ) : (
                    <XCircle className="text-red-600 flex-shrink-0" size={20} />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <FileCode size={16} className="text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">Playwright Configuration</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {result.checks.playwrightConfig
                        ? `Found: ${result.details.configFile}`
                        : 'Not found (playwright.config.ts/js required)'}
                    </p>
                  </div>
                </div>

                {/* Test Files Check */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  {result.checks.testFiles ? (
                    <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
                  ) : (
                    <XCircle className="text-red-600 flex-shrink-0" size={20} />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <TestTube size={16} className="text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">Test Files</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {result.checks.testFiles
                        ? `Detected ${result.details.testFileCount} test file${result.details.testFileCount !== 1 ? 's' : ''}`
                        : 'No test files detected (*.spec.ts, *.test.ts)'}
                    </p>
                  </div>
                </div>

                {/* Page Patterns Check */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  {result.checks.pagePatterns ? (
                    <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
                  ) : (
                    <AlertTriangle className="text-yellow-600 flex-shrink-0" size={20} />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Layers size={16} className="text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">Page Patterns</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {result.checks.pagePatterns
                        ? `Detected ${result.details.pageCount} page object${result.details.pageCount !== 1 ? 's' : ''}`
                        : 'Limited page structure (cache may be incomplete)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Guidance */}
              {!result.compatible && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">What you can do:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Add Playwright tests to your repository</li>
                    <li>• Create a playwright.config.ts configuration file</li>
                    <li>• Organize tests in a tests/ or e2e/ directory</li>
                  </ul>
                </div>
              )}

              {/* Framework Positioning */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-xs text-gray-700">
                  <strong>Breakline V1</strong> supports Playwright-based repositories. This is not a limitation—it's focus.
                  Future versions may support additional frameworks.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                {result.compatible && (
                  <button
                    onClick={onProceed}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                  >
                    <Play size={16} />
                    {result.level === 'partial' ? 'Proceed Anyway' : 'Generate Contract'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
