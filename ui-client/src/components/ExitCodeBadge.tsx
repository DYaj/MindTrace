import type { ExitCode } from '@breakline/ui-types';
import { EXIT_CODE_LABELS, EXIT_CODE_COLORS } from '@breakline/ui-types';

interface ExitCodeBadgeProps {
  code: ExitCode;
  size?: 'sm' | 'md' | 'lg';
}

function ExitCodeBadge({ code, size = 'md' }: ExitCodeBadgeProps) {
  const label = EXIT_CODE_LABELS[code];
  const color = EXIT_CODE_COLORS[code];

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  const colorClasses = {
    green: 'bg-green-100 text-green-800 border-green-300',
    red: code === 3
      ? 'bg-red-100 text-red-900 border-red-400 font-bold' // Policy violation emphasized
      : 'bg-red-100 text-red-800 border-red-300',
    orange: 'bg-orange-100 text-orange-800 border-orange-300'
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${sizeClasses[size]} ${colorClasses[color]}`}
    >
      <span className={`w-2 h-2 rounded-full ${color === 'green' ? 'bg-green-600' : color === 'red' ? 'bg-red-600' : 'bg-orange-600'}`} />
      {label}
    </span>
  );
}

export default ExitCodeBadge;
