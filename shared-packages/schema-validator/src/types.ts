export interface ValidationResult {
  valid: boolean;
  errors?: SchemaError[];
  artifact?: unknown;
}

export interface SchemaError {
  path: string;
  message: string;
  schemaPath?: string;
}

export interface SchemaValidator {
  validateAuthoritative(artifact: unknown, schemaName: string): ValidationResult;
  validateAdvisory(artifact: unknown, schemaName: string): ValidationResult;
  validateJSONLEntry(entry: unknown, schemaName: string): ValidationResult;
  rejectInvalid(artifact: unknown, schemaName: string, category: 'authoritative' | 'advisory'): never;
}
