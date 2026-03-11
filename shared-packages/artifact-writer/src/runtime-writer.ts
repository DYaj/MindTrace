import { writeFileSync, appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { SchemaValidator } from '@mindtrace/schema-validator';
import type { AuthoritativeArtifact, StreamEntry } from './types.js';

export class RuntimeArtifactWriter {
  private runtimePath: string;
  private validator: SchemaValidator;

  constructor(runDir: string) {
    this.runtimePath = join(runDir, 'artifacts', 'runtime');
    this.validator = new SchemaValidator();
    this.ensureDirectory();
  }

  writeRuntimeArtifact(
    artifact: AuthoritativeArtifact,
    schemaName: string,
    filename: string
  ): void {
    // Validate before write
    const result = this.validator.validateAuthoritative(artifact, schemaName);

    if (!result.valid) {
      this.validator.rejectInvalid(artifact, schemaName, 'authoritative');
    }

    // Write to runtime directory
    const filePath = join(this.runtimePath, filename);
    const content = JSON.stringify(artifact, null, 2);
    writeFileSync(filePath, content, 'utf-8');
  }

  appendRuntimeStream(
    entry: StreamEntry,
    schemaName: string,
    streamName: string
  ): void {
    // Validate per-entry
    const result = this.validator.validateJSONLEntry(entry, schemaName);

    if (!result.valid) {
      this.validator.rejectInvalid(entry, schemaName, 'authoritative');
    }

    // Append to JSONL stream
    const filePath = join(this.runtimePath, streamName);
    const line = JSON.stringify(entry) + '\n';
    appendFileSync(filePath, line, 'utf-8');
  }

  private ensureDirectory(): void {
    if (!existsSync(this.runtimePath)) {
      mkdirSync(this.runtimePath, { recursive: true });
    }
  }
}
