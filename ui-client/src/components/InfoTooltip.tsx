import { HelpCircle, LucideIcon } from 'lucide-react';
import { useState, ReactNode } from 'react';

interface InfoTooltipProps {
  title: string;
  content: string | ReactNode;
  icon?: LucideIcon;
  className?: string;
}

/**
 * Hover tooltip component for displaying help text
 */
export default function InfoTooltip({ title, content, icon: Icon, className = '' }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="inline-flex items-center justify-center w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="More information"
      >
        <HelpCircle size={18} />
      </button>

      {isVisible && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-gray-900 text-white text-sm rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-center gap-2 mb-3">
            {Icon && (
              <div className="p-2 bg-white/10 rounded-lg">
                <Icon size={20} className="text-white" />
              </div>
            )}
            <div className="font-semibold">{title}</div>
          </div>
          <div className="text-gray-200 leading-relaxed">
            {typeof content === 'string' ? (
              <div className="whitespace-pre-line">{content}</div>
            ) : (
              content
            )}
          </div>
          {/* Arrow */}
          <div className="absolute -top-2 left-4 w-4 h-4 bg-gray-900 transform rotate-45"></div>
        </div>
      )}
    </div>
  );
}
