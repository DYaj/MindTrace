interface RunFilterBarProps {
  currentFilter: 'all' | 'passed' | 'failed';
  onFilterChange: (filter: 'all' | 'passed' | 'failed') => void;
  counts: {
    total: number;
    passed: number;
    failed: number;
  };
}

export function RunFilterBar({ currentFilter, onFilterChange, counts }: RunFilterBarProps) {
  const filters = [
    { value: 'all' as const, label: 'All', count: counts.total },
    { value: 'passed' as const, label: 'Passed', count: counts.passed },
    { value: 'failed' as const, label: 'Failed', count: counts.failed }
  ];

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700">Show:</span>
      <div className="flex items-center gap-2">
        {filters.map(filter => (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentFilter === filter.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {filter.label} ({filter.count})
          </button>
        ))}
      </div>
    </div>
  );
}
