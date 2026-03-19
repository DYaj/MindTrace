interface StatusIndicatorProps {
  label: string;
  status: 'ok' | 'warning' | 'error';
  'data-testid'?: string;
}

function StatusIndicator({ label, status, 'data-testid': dataTestId }: StatusIndicatorProps) {
  const colors = {
    ok: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  };

  return (
    <div className="flex items-center gap-2" data-testid={dataTestId}>
      <div className={`w-2 h-2 rounded-full ${colors[status]}`} />
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  );
}

export default StatusIndicator;
