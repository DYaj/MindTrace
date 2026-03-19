import { useIntegrity } from '../hooks/useIntegrity';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  FileCode,
  Database,
  GitBranch
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { GateResult, DriftResult } from '@breakline/ui-types';

/**
 * Get plain-English explanation for contract gate state
 */
function getContractExplanation(gate: GateResult): { meaning: string; action: string; actionLink?: string } {
  if (gate.status === 'valid') {
    return {
      meaning: 'Your automation contract is properly structured and ready to use. All required fields are present and valid.',
      action: 'No action needed. You can proceed to build your cache.',
      actionLink: '/cache'
    };
  }

  return {
    meaning: 'Your automation contract has structural issues or is missing required information. Tests cannot run without a valid contract.',
    action: 'Review and fix your contract file. Check that all required fields are present and properly formatted.',
    actionLink: '/contract'
  };
}

/**
 * Get plain-English explanation for cache gate state
 */
function getCacheExplanation(gate: GateResult, contractValid: boolean): { meaning: string; action: string; actionLink?: string } {
  if (!contractValid) {
    return {
      meaning: 'Cache verification requires a valid contract first. Fix the contract before building cache.',
      action: 'Start by ensuring your contract passes validation.',
      actionLink: '/contract'
    };
  }

  if (gate.status === 'valid') {
    return {
      meaning: 'Your page detection cache is properly structured and bound to the current contract. Tests can use this cache.',
      action: 'No action needed. Your cache is ready for test runs.',
      actionLink: '/runs'
    };
  }

  // Check reason for specific guidance
  const reason = gate.reason || '';
  if (reason.includes('missing')) {
    return {
      meaning: 'No cache has been built yet. Tests need a cache to know which pages to run against.',
      action: 'Build your cache by running the cache builder. This scans your application to detect pages.',
      actionLink: '/cache'
    };
  }

  if (reason.includes('Drift detected')) {
    return {
      meaning: 'Your cache was built for an older version of the contract. The contract has changed since the cache was created.',
      action: 'Rebuild your cache to synchronize it with the current contract version.',
      actionLink: '/cache'
    };
  }

  if (reason.includes('schema')) {
    return {
      meaning: 'Your cache file structure is corrupted or incompatible with the expected format.',
      action: 'Rebuild your cache from scratch. This will create a fresh cache with the correct structure.',
      actionLink: '/cache'
    };
  }

  return {
    meaning: 'Your cache has validation issues that prevent tests from running safely.',
    action: 'Rebuild your cache to resolve the issues.',
    actionLink: '/cache'
  };
}

/**
 * Get plain-English explanation for drift check state
 */
function getDriftExplanation(drift: DriftResult, contractValid: boolean, cacheValid: boolean): { meaning: string; action: string; actionLink?: string } {
  if (!contractValid || !cacheValid) {
    return {
      meaning: 'Drift detection requires both contract and cache to be valid.',
      action: 'Fix contract and cache issues first before checking for drift.'
    };
  }

  if (drift.drift === false) {
    return {
      meaning: 'Your cache is perfectly synchronized with your contract. No drift detected.',
      action: 'No action needed. Continue using your cache confidently.'
    };
  }

  if (drift.drift === true) {
    const driftType = drift.driftType || 'unknown';
    if (driftType === 'hash_mismatch') {
      return {
        meaning: 'Your contract fingerprint has changed since the cache was built. The cache is out of sync with the contract.',
        action: 'Rebuild your cache to match the current contract version. This ensures tests run against the correct page definitions.',
        actionLink: '/cache'
      };
    }

    if (driftType === 'binding_missing') {
      return {
        meaning: 'Your cache is missing the contract binding information. It cannot be verified against the contract.',
        action: 'Rebuild your cache with proper contract binding. This links the cache to the contract version.',
        actionLink: '/cache'
      };
    }

    return {
      meaning: 'Your cache and contract are out of sync. Tests may not run correctly.',
      action: 'Rebuild your cache to synchronize with the current contract.',
      actionLink: '/cache'
    };
  }

  return {
    meaning: 'Cannot determine drift status. This usually means contract or cache is invalid.',
    action: 'Ensure both contract and cache are valid before drift can be checked.'
  };
}

interface EnhancedGateCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  gateResult: GateResult;
  explanation: { meaning: string; action: string; actionLink?: string };
  testId: string;
}

function EnhancedGateCard({ title, description, icon: Icon, gateResult, explanation, testId }: EnhancedGateCardProps) {
  const isValid = gateResult.status === 'valid';

  const config = isValid ? {
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Passed',
    labelBg: 'bg-green-100',
    labelText: 'text-green-800'
  } : {
    iconColor: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Failed',
    labelBg: 'bg-red-100',
    labelText: 'text-red-800'
  };

  return (
    <div className={`bg-white rounded-lg border-2 ${config.borderColor} overflow-hidden`} data-testid={testId}>
      {/* Header */}
      <div className={`${config.bgColor} px-6 py-4 border-b ${config.borderColor}`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-white border ${config.borderColor}`}>
            <Icon className={config.iconColor} size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.labelBg} ${config.labelText}`}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-4 space-y-4">
        {/* What this means */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">What this means</h4>
          <p className="text-sm text-gray-700">{explanation.meaning}</p>
        </div>

        {/* What to do */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">What to do</h4>
          <p className="text-sm text-gray-700">{explanation.action}</p>
          {explanation.actionLink && (
            <Link
              to={explanation.actionLink}
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              data-testid={`${testId}-action-link`}
            >
              Go to {explanation.actionLink === '/contract' ? 'Contract' : explanation.actionLink === '/cache' ? 'Cache' : 'Runs'}
              <ArrowRight size={16} />
            </Link>
          )}
        </div>

        {/* Technical details (collapsible) */}
        {((gateResult.status === 'invalid' && gateResult.reason) || gateResult.details) && (
          <details className="mt-4">
            <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900 font-medium">
              Show technical details
            </summary>
            <div className="mt-2 space-y-2">
              {gateResult.status === 'invalid' && gateResult.reason && (
                <div>
                  <span className="text-xs text-gray-500 uppercase">Reason:</span>
                  <p className="text-sm text-gray-700 mt-1">{gateResult.reason}</p>
                </div>
              )}
              {gateResult.details && (
                <div>
                  <span className="text-xs text-gray-500 uppercase">Details:</span>
                  <pre className="text-xs font-mono text-gray-700 mt-1 bg-gray-50 p-2 rounded overflow-x-auto">
                    {gateResult.details}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

interface DriftCardProps {
  driftResult: DriftResult;
  explanation: { meaning: string; action: string; actionLink?: string };
}

function DriftCard({ driftResult, explanation }: DriftCardProps) {
  const driftState = driftResult.drift;

  const config = driftState === false ? {
    icon: CheckCircle,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'No Drift',
    labelBg: 'bg-green-100',
    labelText: 'text-green-800'
  } : driftState === true ? {
    icon: AlertTriangle,
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    label: 'Drift Detected',
    labelBg: 'bg-orange-100',
    labelText: 'text-orange-800'
  } : {
    icon: HelpCircle,
    iconColor: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    label: 'Cannot Determine',
    labelBg: 'bg-gray-100',
    labelText: 'text-gray-800'
  };

  const Icon = config.icon;

  return (
    <div className={`bg-white rounded-lg border-2 ${config.borderColor} overflow-hidden`} data-testid="drift-check">
      {/* Header */}
      <div className={`${config.bgColor} px-6 py-4 border-b ${config.borderColor}`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-white border ${config.borderColor}`}>
            <Icon className={config.iconColor} size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Drift Safety Check</h3>
            <p className="text-sm text-gray-600 mt-1">Verifies contract and cache are synchronized</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.labelBg} ${config.labelText}`}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-4 space-y-4">
        {/* What this means */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">What this means</h4>
          <p className="text-sm text-gray-700">{explanation.meaning}</p>
        </div>

        {/* What to do */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">What to do</h4>
          <p className="text-sm text-gray-700">{explanation.action}</p>
          {explanation.actionLink && (
            <Link
              to={explanation.actionLink}
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              data-testid="drift-check-action-link"
            >
              Rebuild Cache
              <ArrowRight size={16} />
            </Link>
          )}
        </div>

        {/* Technical details (collapsible) */}
        {driftState !== null && (
          <details className="mt-4">
            <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900 font-medium">
              Show technical details
            </summary>
            <div className="mt-2 space-y-2">
              {driftState === true && (
                <>
                  <div>
                    <span className="text-xs text-gray-500 uppercase">Drift Type:</span>
                    <p className="text-sm text-gray-700 mt-1">{driftResult.driftType}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase">Expected Hash:</span>
                    <p className="text-xs font-mono text-gray-700 mt-1 break-all">{driftResult.expectedHash}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase">Actual Hash:</span>
                    <p className="text-xs font-mono text-gray-700 mt-1 break-all">{driftResult.actualHash}</p>
                  </div>
                </>
              )}
              {driftState === false && (
                <div>
                  <span className="text-xs text-gray-500 uppercase">Current Hash:</span>
                  <p className="text-xs font-mono text-gray-700 mt-1 break-all">{driftResult.currentHash}</p>
                </div>
              )}
              {driftResult.details && (
                <div>
                  <span className="text-xs text-gray-500 uppercase">Details:</span>
                  <p className="text-xs text-gray-700 mt-1">{driftResult.details}</p>
                </div>
              )}
            </div>
          </details>
        )}

        {driftState === null && driftResult.reason && (
          <div className="mt-2">
            <span className="text-xs text-gray-500 uppercase">Reason:</span>
            <p className="text-sm text-gray-700 mt-1">{driftResult.reason}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function IntegrityPage() {
  const { data: integrity, isLoading, error } = useIntegrity();

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6" data-testid="integrity-page-loading">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !integrity) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6" data-testid="integrity-page-error">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load integrity status: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  const contractValid = integrity.contractGate.status === 'valid';
  const cacheValid = integrity.cacheGate.status === 'valid';
  const noDrift = integrity.driftCheck.drift === false;

  const allValid = contractValid && cacheValid && noDrift;
  const anyInvalid = integrity.contractGate.status === 'invalid' || integrity.cacheGate.status === 'invalid';

  const contractExplanation = getContractExplanation(integrity.contractGate);
  const cacheExplanation = getCacheExplanation(integrity.cacheGate, contractValid);
  const driftExplanation = getDriftExplanation(integrity.driftCheck, contractValid, cacheValid);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6" data-testid="integrity-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Integrity Gates</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">
          Automated safety checks that protect your test runs from invalid or inconsistent state
        </p>
      </div>

      {/* Overall Status Banner */}
      <div
        className={`rounded-lg border-2 p-4 sm:p-6 ${
          allValid ? 'bg-green-50 border-green-200' :
          anyInvalid ? 'bg-red-50 border-red-200' :
          'bg-yellow-50 border-yellow-200'
        }`}
        data-testid="integrity-overall-status"
      >
        <div className="flex items-start gap-3 sm:gap-4">
          {allValid ? (
            <CheckCircle className="text-green-600 flex-shrink-0" size={28} />
          ) : anyInvalid ? (
            <XCircle className="text-red-600 flex-shrink-0" size={28} />
          ) : (
            <HelpCircle className="text-yellow-600 flex-shrink-0" size={28} />
          )}
          <div className="flex-1 min-w-0">
            <h2
              className={`text-lg sm:text-xl font-semibold ${
                allValid ? 'text-green-900' :
                anyInvalid ? 'text-red-900' :
                'text-yellow-900'
              }`}
            >
              {allValid ? 'All Gates Passed' :
               anyInvalid ? 'Gate Failures Detected' :
               'Incomplete Verification'}
            </h2>
            <p
              className={`text-sm sm:text-base mt-1 ${
                allValid ? 'text-green-800' :
                anyInvalid ? 'text-red-800' :
                'text-yellow-800'
              }`}
            >
              {allValid ? 'Your system is ready to run tests. All integrity checks have passed.' :
               anyInvalid ? 'Some integrity checks have failed. Review and fix the issues below before running tests.' :
               'Integrity verification is incomplete. Ensure contract and cache are properly configured.'}
            </p>
          </div>
        </div>
      </div>

      {/* Visual Flow Diagram */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Integrity Flow</h3>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 text-sm">
            <FileCode className="text-blue-600" size={20} />
            <span className="font-medium text-gray-900">Contract</span>
          </div>
          <ArrowRight className="text-gray-400 rotate-90 sm:rotate-0" size={20} />
          <div className="flex items-center gap-2 text-sm">
            <Database className="text-purple-600" size={20} />
            <span className="font-medium text-gray-900">Cache</span>
          </div>
          <ArrowRight className="text-gray-400 rotate-90 sm:rotate-0" size={20} />
          <div className="flex items-center gap-2 text-sm">
            <GitBranch className="text-green-600" size={20} />
            <span className="font-medium text-gray-900">Drift Check</span>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-4 text-center">
          Each gate depends on the previous one. Fix issues from left to right.
        </p>
      </div>

      {/* Gate Cards */}
      <div className="space-y-6">
        <EnhancedGateCard
          title="Contract Integrity Gate"
          description="Validates your automation contract structure and completeness"
          icon={FileCode}
          gateResult={integrity.contractGate}
          explanation={contractExplanation}
          testId="contract-gate"
        />

        <EnhancedGateCard
          title="Cache Integrity Gate"
          description="Validates your page detection cache structure and contract binding"
          icon={Database}
          gateResult={integrity.cacheGate}
          explanation={cacheExplanation}
          testId="cache-gate"
        />

        <DriftCard
          driftResult={integrity.driftCheck}
          explanation={driftExplanation}
        />
      </div>
    </div>
  );
}
