import { join } from 'path';
import { SchemaValidator } from '@mindtrace/schema-validator';
import { FileSystemGuard, WriteAuthorityRegistry } from '@mindtrace/filesystem-guard';
import type { AuthoritativeArtifact, AdvisoryArtifact, StreamEntry } from './types.js';

export class GuardedRuntimeWriter {
  private runtimePath: string;
  private validator: SchemaValidator;
  private writerId = 'runtime-artifact-writer';

  constructor(
    runDir: string,
    private guard: FileSystemGuard
  ) {
    this.runtimePath = join(runDir, 'artifacts', 'runtime');
    this.validator = new SchemaValidator();
  }

  writeRuntimeArtifact(
    artifact: AuthoritativeArtifact,
    schemaName: string,
    filename: string
  ): void {
    // Layer 1: Schema validation
    const result = this.validator.validateAuthoritative(artifact, schemaName);

    if (!result.valid) {
      this.validator.rejectInvalid(artifact, schemaName, 'authoritative');
    }

    // Layer 3: Filesystem guard
    const filePath = join(this.runtimePath, filename);
    const content = JSON.stringify(artifact, null, 2);

    this.guard.guardedWriteFile(this.writerId, filePath, content);
  }

  appendRuntimeStream(
    entry: StreamEntry,
    schemaName: string,
    streamName: string
  ): void {
    // Layer 1: Schema validation
    const result = this.validator.validateJSONLEntry(entry, schemaName);

    if (!result.valid) {
      this.validator.rejectInvalid(entry, schemaName, 'authoritative');
    }

    // Layer 3: Filesystem guard
    const filePath = join(this.runtimePath, streamName);
    const line = JSON.stringify(entry) + '\n';

    this.guard.guardedAppendFile(this.writerId, filePath, line);
  }

  // Internal method for testing bypass attempts
  private writeToPath(artifact: unknown, schemaName: string, targetPath: string): void {
    this.guard.guardedWriteFile(this.writerId, targetPath, JSON.stringify(artifact));
  }
}

export class GuardedAdvisoryWriter {
  private advisoryPath: string;
  private validator: SchemaValidator;
  private writerId = 'advisory-artifact-writer';

  constructor(
    runDir: string,
    private guard: FileSystemGuard
  ) {
    this.advisoryPath = join(runDir, 'artifacts', 'advisory');
    this.validator = new SchemaValidator();
  }

  writeAdvisoryArtifact(
    artifact: AdvisoryArtifact,
    schemaName: string,
    filename: string
  ): void {
    // Layer 1: Schema validation
    const result = this.validator.validateAdvisory(artifact, schemaName);

    if (!result.valid) {
      this.validator.rejectInvalid(artifact, schemaName, 'advisory');
    }

    // Layer 2: Verify artifactClass
    if (artifact.artifactClass !== 'advisory') {
      throw new Error(
        'CROSS_DIRECTORY_WRITE: Attempted to write non-advisory artifact to advisory directory'
      );
    }

    // Layer 3: Filesystem guard
    const filePath = join(this.advisoryPath, filename);
    const content = JSON.stringify(artifact, null, 2);

    this.guard.guardedAppendFile(this.writerId, filePath, content);
  }

  // Internal method for testing bypass attempts
  private writeToPath(artifact: unknown, schemaName: string, targetPath: string): void {
    this.guard.guardedWriteFile(this.writerId, targetPath, JSON.stringify(artifact));
  }
}

export function initializeGuardedWriters(runDir: string) {
  const registry = new WriteAuthorityRegistry();
  const guard = new FileSystemGuard(registry);

  // Register runtime writer with its allowed paths
  registry.registerWriter('runtime-artifact-writer', {
    allowedPaths: [join(runDir, 'artifacts', 'runtime')],
    capability: 'write-authoritative',
    description: 'Runtime artifact writer for authoritative artifacts'
  });

  // Register advisory writer with its allowed paths
  registry.registerWriter('advisory-artifact-writer', {
    allowedPaths: [join(runDir, 'artifacts', 'advisory')],
    capability: 'write-advisory',
    description: 'Advisory artifact writer for analysis artifacts'
  });

  const runtimeWriter = new GuardedRuntimeWriter(runDir, guard);
  const advisoryWriter = new GuardedAdvisoryWriter(runDir, guard);

  return {
    runtimeWriter,
    advisoryWriter,
    guard,
    registry
  };
}
