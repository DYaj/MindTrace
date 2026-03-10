import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { ValidationResult, SchemaError } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class SchemaValidator {
  private ajv: Ajv;
  private schemaCache: Map<string, object> = new Map();

  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
  }

  validateAuthoritative(artifact: unknown, schemaName: string): ValidationResult {
    return this.validate(artifact, schemaName, 'authoritative');
  }

  validateAdvisory(artifact: unknown, schemaName: string): ValidationResult {
    return this.validate(artifact, schemaName, 'advisory');
  }

  validateJSONLEntry(entry: unknown, schemaName: string): ValidationResult {
    return this.validate(entry, schemaName, 'authoritative');
  }

  rejectInvalid(artifact: unknown, schemaName: string, category: 'authoritative' | 'advisory'): never {
    const result = this.validate(artifact, schemaName, category);

    if (!result.valid) {
      const errorMessages = result.errors!.map(e => `${e.path}: ${e.message}`).join(', ');
      throw new Error(`Schema validation failed for ${category}/${schemaName}: ${errorMessages}`);
    }

    throw new Error('Unreachable: artifact was valid');
  }

  private validate(artifact: unknown, schemaName: string, category: 'authoritative' | 'advisory'): ValidationResult {
    const schema = this.loadSchema(schemaName, category);
    const validate = this.ajv.compile(schema);
    const valid = validate(artifact);

    if (valid) {
      return { valid: true, artifact };
    }

    const errors: SchemaError[] = (validate.errors || []).map((err: ErrorObject) => ({
      path: err.instancePath || 'root',
      message: err.message || 'Validation error',
      schemaPath: err.schemaPath
    }));

    return { valid: false, errors };
  }

  private loadSchema(schemaName: string, category: string): object {
    const cacheKey = `${category}/${schemaName}`;

    if (this.schemaCache.has(cacheKey)) {
      return this.schemaCache.get(cacheKey)!;
    }

    const schemaPath = join(__dirname, '../../../schemas', category, `${schemaName}.schema.json`);

    try {
      const schemaContent = readFileSync(schemaPath, 'utf-8');
      const schema = JSON.parse(schemaContent);
      this.schemaCache.set(cacheKey, schema);
      return schema;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Schema not found: ${category}/${schemaName}.schema.json at ${schemaPath}`);
      }
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in schema: ${category}/${schemaName}.schema.json`);
      }
      throw error;
    }
  }
}
