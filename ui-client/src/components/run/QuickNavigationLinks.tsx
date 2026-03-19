import { Link } from 'react-router-dom';
import { Shield, Database, FileCode, ArrowRight } from 'lucide-react';

export function QuickNavigationLinks() {
  const links = [
    {
      to: '/integrity',
      icon: Shield,
      label: 'View Integrity'
    },
    {
      to: '/cache',
      icon: Database,
      label: 'View Cache'
    },
    {
      to: '/contract',
      icon: FileCode,
      label: 'View Contract'
    }
  ];

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Quick Links:</span>
        <div className="flex flex-wrap items-center gap-3">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              <link.icon size={16} />
              {link.label}
              <ArrowRight size={14} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
