import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { SchemaValidator } from '@mindtrace/schema-validator';
import type { AdvisoryArtifact } from './types.js';

export class AdvisoryArtifactWriter {
  private advisoryPath: string;
  private validator: SchemaValidator;

  constructor(runDir: string) {
    this.advisoryPath = join(runDir, 'artifacts', 'advisory');
    this.validator = new SchemaValidator();
    this.ensureDirectory();
  }

  writeAdvisoryArtifact(
    artifact: AdvisoryArtifact,
    schemaName: string,
    filename: string
  ): void {
    // Validate before write
    const result = this.validator.validateAdvisory(artifact, schemaName);

    if (!result.valid) {
      this.validator.rejectInvalid(artifact, schemaName, 'advisory');
    }

    // Verify artifactClass is advisory (extra safety check)
    if (artifact.artifactClass !== 'advisory') {
      throw new Error(
        'CROSS_DIRECTORY_WRITE: Attempted to write non-advisory artifact to advisory directory'
      );
    }

    // Write to advisory directory
    const filePath = join(this.advisoryPath, filename);
    const content = JSON.stringify(artifact, null, 2);
    writeFileSync(filePath, content, 'utf-8');
  }

  private ensureDirectory(): void {
    if (!existsSync(this.advisoryPath)) {
      mkdirSync(this.advisoryPath, { recursive: true });
    }
  }
}
