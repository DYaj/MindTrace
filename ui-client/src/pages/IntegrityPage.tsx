import { useIntegrity } from '../hooks/useIntegrity';
import { Shield, CheckCircle, XCircle, AlertTriangle, HelpCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { GateResult } from '@breakline/ui-types';

function GateCard({
  title,
  description,
  gateResult
}: {
  title: string;
  description: string;
  gateResult: GateResult;
}) {
  const isValid = gateResult.status === 'valid';

  const config = isValid ? {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Valid'
  } : {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Invalid'
  };

  const Icon = config.icon;

  return (
    <div className={`bg-white rounded-lg border ${config.borderColor} p-6`}>
      <div className="flex items-start gap-3 mb-4">
        <Icon className={config.color} size={24} />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
          {config.label}
        </span>
      </div>

      {gateResult.status === 'invalid' && gateResult.reason && (
        <div className="mb-2">
          <span className="text-xs text-gray-500 uppercase">Reason:</span>
          <p className="text-sm text-gray-700 mt-1">{gateResult.reason}</p>
        </div>
      )}

      {gateResult.details && (
        <div className="mt-3 p-3 bg-gray-50 rounded text-xs font-mono text-gray-600 break-words">
          {gateResult.details}
        </div>
      )}
    </div>
  );
}

export function IntegrityPage() {
  const { data: integrity, isLoading, error } = useIntegrity();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 gap-6">
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !integrity) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load integrity status: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  const allValid = integrity.contractGate.status === 'valid' &&
                   integrity.cacheGate.status === 'valid' &&
                   integrity.driftCheck.drift === false;
  const anyInvalid = integrity.contractGate.status === 'invalid' ||
                     integrity.cacheGate.status === 'invalid';

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Integrity Gates</h1>
        <p className="text-gray-600 mt-2">Governance safety checks</p>
      </div>

      {/* Overall Status Banner */}
      <div className={`rounded-lg border p-4 mb-6 ${
        allValid ? 'bg-green-50 border-green-200' :
        anyInvalid ? 'bg-red-50 border-red-200' :
        'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center gap-3">
          {allValid ? (
            <CheckCircle className="text-green-600" size={24} />
          ) : anyInvalid ? (
            <XCircle className="text-red-600" size={24} />
          ) : (
            <HelpCircle className="text-yellow-600" size={24} />
          )}
          <div>
            <h2 className={`font-semibold ${
              allValid ? 'text-green-900' :
              anyInvalid ? 'text-red-900' :
              'text-yellow-900'
            }`}>
              {allValid ? 'All Gates Passed' :
               anyInvalid ? 'Gate Failures Detected' :
               'Gates Not Fully Checked'}
            </h2>
            <p className={`text-sm ${
              allValid ? 'text-green-800' :
              anyInvalid ? 'text-red-800' :
              'text-yellow-800'
            }`}>
              {allValid ? 'System integrity verified' :
               anyInvalid ? 'Review gate failures below' :
               'Integrity checks pending'}
            </p>
          </div>
        </div>
      </div>

      {/* Gate Cards */}
      <div className="grid grid-cols-1 gap-6">
        <GateCard
          title="Contract Integrity Gate"
          description="Validates automation contract structure and completeness"
          gateResult={integrity.contractGate}
        />

        <GateCard
          title="Cache Integrity Gate"
          description="Validates page detection cache structure and binding"
          gateResult={integrity.cacheGate}
        />

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start gap-3 mb-4">
            <Shield className={
              integrity.driftCheck.drift === true ? 'text-orange-600' :
              integrity.driftCheck.drift === null ? 'text-gray-400' :
              'text-green-600'
            } size={24} />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Drift Safety Check</h3>
              <p className="text-sm text-gray-600 mt-1">Detects contract/cache synchronization drift</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              integrity.driftCheck.drift === true ? 'bg-orange-50 text-orange-600' :
              integrity.driftCheck.drift === null ? 'bg-gray-50 text-gray-600' :
              'bg-green-50 text-green-600'
            }`}>
              {integrity.driftCheck.drift === true ? 'Drift Detected' :
               integrity.driftCheck.drift === null ? 'Cannot Determine' :
               'No Drift'}
            </span>
          </div>

          {integrity.driftCheck.drift === true && (
            <>
              <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded">
                <div className="flex items-start justify-between gap-4">
                  <div className="text-sm text-orange-900">
                    <strong>Cache no longer matches current contract.</strong>
                    <br />
                    Rebuild cache to synchronize with current contract version.
                  </div>
                  <Link
                    to="/cache"
                    className="flex items-center gap-1 px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-900 rounded text-sm font-medium whitespace-nowrap transition-colors"
                  >
                    Go to Cache
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
              <div className="mb-2">
                <span className="text-xs text-gray-500 uppercase">Drift Type:</span>
                <span className="ml-2 text-sm text-gray-700">{integrity.driftCheck.driftType}</span>
              </div>
              <div className="mb-2">
                <span className="text-xs text-gray-500 uppercase">Expected Hash:</span>
                <p className="text-xs font-mono text-gray-700 mt-1 break-all">
                  {integrity.driftCheck.expectedHash}
                </p>
              </div>
              <div className="mb-2">
                <span className="text-xs text-gray-500 uppercase">Actual Hash:</span>
                <p className="text-xs font-mono text-gray-700 mt-1 break-all">
                  {integrity.driftCheck.actualHash}
                </p>
              </div>
            </>
          )}

          {integrity.driftCheck.drift === false && (
            <div className="mb-2">
              <span className="text-xs text-gray-500 uppercase">Current Hash:</span>
              <p className="text-xs font-mono text-gray-700 mt-1 break-all">
                {integrity.driftCheck.currentHash}
              </p>
            </div>
          )}

          {integrity.driftCheck.drift === null && (
            <div className="mb-2">
              <span className="text-xs text-gray-500 uppercase">Reason:</span>
              <p className="text-sm text-gray-700 mt-1">{integrity.driftCheck.reason}</p>
            </div>
          )}

          {(integrity.driftCheck.drift === true || integrity.driftCheck.drift === false) &&
           integrity.driftCheck.details && (
            <div className="mt-3 p-3 bg-gray-50 rounded text-xs font-mono text-gray-600 break-words">
              {integrity.driftCheck.details}
            </div>
          )}
        </div>
      </div>

      {/* Stage 2 Notice */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-blue-600 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Stage 2 Stub - Integration Pending</h3>
            <p className="text-sm text-blue-800">
              This page currently shows placeholder data. Stage 3+ will integrate with <code className="bg-blue-100 px-1 py-0.5 rounded">@mindtrace/integrity-gates</code> package to display real gate results.
            </p>
            <p className="text-sm text-blue-800 mt-2">
              <strong>Important:</strong> Gate logic will NEVER be implemented in the UI server. All validation is delegated to the integrity-gates package to maintain single source of truth.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
