export type ValidationResult = {
    ok: true;
} | {
    ok: false;
    errors: unknown;
};
export declare function readJsonFile<T = unknown>(p: string): T;
export declare function listSchemaFiles(contractsDir: string): string[];
/**
 * Strict schema validation. Deterministic. CI-safe.
 */
export declare function validateAgainstSchema(schema: unknown, data: unknown): ValidationResult;
/**
 * Convenience: validate by schema file path.
 */
export declare function validateFilePair(schemaPath: string, dataPath: string): ValidationResult;
//# sourceMappingURL=index.d.ts.map