import { FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export type ArtifactCategory = 'core' | 'integrity' | 'healing' | 'debug';

interface Artifact {
  name: string;
  path: string;
  size: number;
  type: 'json' | 'txt' | 'other';
}

interface ArtifactGroupProps {
  title: string;
  description: string;
  artifacts: Artifact[];
  category: ArtifactCategory;
  onArtifactClick: (path: string, name: string, type: 'json' | 'txt' | 'other') => void;
}

const categoryColors = {
  core: 'border-blue-200 bg-blue-50',
  integrity: 'border-purple-200 bg-purple-50',
  healing: 'border-green-200 bg-green-50',
  debug: 'border-gray-200 bg-gray-50'
};

export function ArtifactGroup({ title, description, artifacts, category, onArtifactClick }: ArtifactGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (artifacts.length === 0) return null;

  return (
    <div className={`border rounded-lg overflow-hidden ${categoryColors[category]}`} data-testid={`artifact-group-${category}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-opacity-80 transition-colors"
        data-testid={`artifact-group-${category}-toggle`}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-600">{description} • {artifacts.length} file{artifacts.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </button>

      {/* Artifacts List */}
      {isExpanded && (
        <div className="border-t divide-y divide-gray-200 bg-white">
          {artifacts.map((artifact, index) => (
            <button
              key={index}
              data-testid={`artifact-item-${artifact.name}`}
              onClick={() => onArtifactClick(artifact.path, artifact.name, artifact.type)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText size={16} className="text-gray-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-900 truncate">{artifact.name}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                  {artifact.type}
                </span>
                <span className="text-xs text-gray-600">
                  {(artifact.size / 1024).toFixed(1)} KB
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to categorize artifacts
export function categorizeArtifacts(artifacts: Artifact[]): Record<ArtifactCategory, Artifact[]> {
  const categorized: Record<ArtifactCategory, Artifact[]> = {
    core: [],
    integrity: [],
    healing: [],
    debug: []
  };

  artifacts.forEach(artifact => {
    const name = artifact.name.toLowerCase();
    const path = artifact.path.toLowerCase();

    // Integrity artifacts
    if (name.includes('contract') || name.includes('drift') || name.includes('integrity') ||
        name.includes('policy') || path.includes('integrity')) {
      categorized.integrity.push(artifact);
    }
    // Healing artifacts
    else if (name.includes('heal') || name.includes('recovery') || name.includes('fallback') ||
             path.includes('healing')) {
      categorized.healing.push(artifact);
    }
    // Debug artifacts
    else if (name.includes('debug') || name.includes('trace') || name.includes('log') ||
             name.includes('dump') || name.includes('screenshot') || path.includes('debug')) {
      categorized.debug.push(artifact);
    }
    // Core artifacts (default)
    else {
      categorized.core.push(artifact);
    }
  });

  return categorized;
}
