import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  Play,
  StopCircle,
  FileCheck,
  Code
} from 'lucide-react';

interface AuditEvent {
  timestamp: string;
  type: string;
  message: string;
  details?: any;
}

interface AuditEventItemProps {
  event: AuditEvent;
  index: number;
  isLast: boolean;
}

type EventCategory = 'success' | 'error' | 'warning' | 'gate' | 'lifecycle' | 'info';

function categorizeEvent(event: AuditEvent): EventCategory {
  const type = event.type.toLowerCase();
  const message = event.message.toLowerCase();

  // Check for failures/errors
  if (type.includes('fail') || type.includes('error') || message.includes('fail')) {
    return 'error';
  }

  // Check for warnings
  if (type.includes('warn') || message.includes('warning')) {
    return 'warning';
  }

  // Check for gate events
  if (type.includes('gate') || type.includes('policy') || type.includes('integrity')) {
    // If gate passed
    if (message.includes('pass') || message.includes('valid')) {
      return 'success';
    }
    return 'gate';
  }

  // Check for lifecycle events
  if (type.includes('start') || type.includes('end') || type.includes('init')) {
    return 'lifecycle';
  }

  // Check for success
  if (type.includes('success') || type.includes('complete') || message.includes('success')) {
    return 'success';
  }

  return 'info';
}

function getEventConfig(category: EventCategory) {
  switch (category) {
    case 'success':
      return {
        icon: CheckCircle,
        iconColor: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        label: 'Success',
        labelColor: 'bg-green-100 text-green-800'
      };
    case 'error':
      return {
        icon: XCircle,
        iconColor: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: 'Error',
        labelColor: 'bg-red-100 text-red-800'
      };
    case 'warning':
      return {
        icon: AlertTriangle,
        iconColor: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        label: 'Warning',
        labelColor: 'bg-orange-100 text-orange-800'
      };
    case 'gate':
      return {
        icon: Shield,
        iconColor: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        label: 'Gate',
        labelColor: 'bg-purple-100 text-purple-800'
      };
    case 'lifecycle':
      return {
        icon: Play,
        iconColor: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        label: 'Lifecycle',
        labelColor: 'bg-blue-100 text-blue-800'
      };
    default:
      return {
        icon: Activity,
        iconColor: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        label: 'Info',
        labelColor: 'bg-gray-100 text-gray-800'
      };
  }
}

export function AuditEventItem({ event, index, isLast }: AuditEventItemProps) {
  const category = categorizeEvent(event);
  const config = getEventConfig(category);
  const Icon = config.icon;

  return (
    <div
      data-testid={`run-detail-audit-event-${index}`}
      className="relative"
    >
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200" />
      )}

      <div className="flex gap-4 p-4 hover:bg-gray-50 transition-colors">
        {/* Icon with background */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-full ${config.bgColor} border-2 ${config.borderColor} flex items-center justify-center z-10`}>
          <Icon className={config.iconColor} size={20} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-1">
          {/* Header: Type, Label, Timestamp */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{event.type}</span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${config.labelColor}`}>
              {config.label}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(event.timestamp).toLocaleString()}
            </span>
          </div>

          {/* Message */}
          <p className="text-sm text-gray-700 mb-2">{event.message}</p>

          {/* Details (collapsible if large) */}
          {event.details && Object.keys(event.details).length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900">
                View details
              </summary>
              <pre className="mt-2 text-xs bg-gray-900 text-green-400 p-3 rounded font-mono overflow-x-auto border border-gray-700">
                {JSON.stringify(event.details, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
