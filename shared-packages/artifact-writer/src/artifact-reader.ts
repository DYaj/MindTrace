import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export class AuthorityBoundaryViolation extends Error {
  constructor(message: string, public exitCode: number = 3) {
    super(message);
    this.name = 'AuthorityBoundaryViolation';
  }
}

export interface ArtifactLocation {
  path: string;
  isLegacy: boolean;
}

export class ArtifactReader {
  constructor(private runDir: string) {}

  /**
   * Read artifact with fallback to legacy location
   * Tries new structure first (artifacts/runtime/ or artifacts/advisory/),
   * then falls back to legacy flat structure
   */
  readArtifact(filename: string, category: 'runtime' | 'advisory'): any | null {
    const location = this.locateArtifact(filename, category);

    if (!location) {
      return null;
    }

    const content = readFileSync(location.path, 'utf-8');
    const artifact = JSON.parse(content);

    // Add metadata about legacy status for debugging
    if (location.isLegacy) {
      artifact._legacyLocation = true;
    }

    return artifact;
  }

  /**
   * Locate artifact in new structure or legacy structure
   */
  locateArtifact(filename: string, category: 'runtime' | 'advisory'): ArtifactLocation | null {
    // Try new hierarchical structure first
    const newPath = join(this.runDir, 'artifacts', category, filename);
    if (existsSync(newPath)) {
      return { path: newPath, isLegacy: false };
    }

    // Fall back to legacy flat structure
    const legacyPath = join(this.runDir, 'artifacts', filename);
    if (existsSync(legacyPath)) {
      return { path: legacyPath, isLegacy: true };
    }

    return null;
  }

  /**
   * Check if run uses legacy flat structure
   */
  isLegacyRun(): boolean {
    const runtimeDir = join(this.runDir, 'artifacts', 'runtime');
    const advisoryDir = join(this.runDir, 'artifacts', 'advisory');

    // If neither new directory exists, it's legacy
    return !existsSync(runtimeDir) && !existsSync(advisoryDir);
  }

  /**
   * Enforce that artifact is authoritative (for execution)
   * Throws if advisory artifact is being consumed as execution input
   */
  enforceAuthoritative(artifact: any, context: string): void {
    if (!artifact) {
      return; // null artifacts are handled elsewhere
    }

    if (artifact.artifactClass === 'advisory') {
      throw new AuthorityBoundaryViolation(
        `AUTHORITY_BOUNDARY_VIOLATION: Attempted to consume advisory artifact as authoritative execution input in ${context}. ` +
        `Advisory artifacts must never influence execution decisions.`,
        3 // exit code for policy/compliance violation
      );
    }

    if (artifact.artifactClass !== 'authoritative') {
      throw new AuthorityBoundaryViolation(
        `INVALID_ARTIFACT_CLASS: Artifact must have artifactClass='authoritative' for execution, got '${artifact.artifactClass}' in ${context}`,
        3
      );
    }
  }

  /**
   * Read authoritative artifact with enforcement
   * Safe for use in execution paths
   */
  readAuthoritativeArtifact(filename: string, context: string): any | null {
    const artifact = this.readArtifact(filename, 'runtime');

    if (artifact) {
      this.enforceAuthoritative(artifact, context);
    }

    return artifact;
  }
}
