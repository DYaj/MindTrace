export class SchemaValidationError extends Error {
  constructor(
    public schemaName: string,
    public category: string,
    public errors: Array<{ path: string; message: string }>,
    public exitCode: number = 3
  ) {
    super(`Schema validation failed for ${category}/${schemaName}`);
    this.name = 'SchemaValidationError';
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      schemaName: this.schemaName,
      category: this.category,
      errors: this.errors,
      exitCode: this.exitCode
    };
  }
}
