import type { ExitCode } from '@breakline/ui-types';
import { EXIT_CODE_LABELS, EXIT_CODE_COLORS } from '@breakline/ui-types';

interface ExitCodeBadgeProps {
  code: ExitCode;
  size?: 'sm' | 'md' | 'lg';
  testsPassed?: number;
  testsFailed?: number;
}

function ExitCodeBadge({ code, size = 'md', testsPassed, testsFailed }: ExitCodeBadgeProps) {
  // Check for no-tests condition (exit 0 but no tests executed)
  const totalTests = (testsPassed ?? 0) + (testsFailed ?? 0);
  const isNoTests = code === 0 && totalTests === 0 && testsPassed !== undefined && testsFailed !== undefined;

  const label = isNoTests ? 'No Tests' : EXIT_CODE_LABELS[code];
  const color = isNoTests ? 'yellow' : EXIT_CODE_COLORS[code];

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
    orange: 'bg-orange-100 text-orange-800 border-orange-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300'
  };

  const dotColor = color === 'green' ? 'bg-green-600'
    : color === 'red' ? 'bg-red-600'
    : color === 'yellow' ? 'bg-yellow-600'
    : 'bg-orange-600';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${sizeClasses[size]} ${colorClasses[color]}`}
    >
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
}

export default ExitCodeBadge;
