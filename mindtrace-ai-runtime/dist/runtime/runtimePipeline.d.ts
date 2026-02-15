export type MindTraceRunContext = {
    runName: string;
    baseDir: string;
    runsDir: string;
    runDir: string;
    artifactsDir: string;
    auditDir: string;
    historyDir: string;
};
export declare function ensureRunLayout(runName: string, baseDir?: string): MindTraceRunContext;
/**
 * Post-run artifact generation hook.
 * Minimal placeholder: ensures directories exist. Real generation can be wired later.
 */
export declare function postRunGenerateArtifacts(ctx: MindTraceRunContext): Promise<void>;
/**
 * Artifact validation hook (placeholder).
 * In a stricter implementation, you’d check required artifact files/JSON schemas.
 */
export declare function validateArtifacts(ctx: MindTraceRunContext): Promise<void>;
/**
 * Governance gate hook (placeholder).
 * In a strict implementation, you’d read RCA results and decide pass/fail.
 */
export declare function governanceGate(ctx: MindTraceRunContext): Promise<void>;
/**
 * Audit trail finalization hook (placeholder).
 * Creates empty ndjson/final.json if missing to avoid downstream failures.
 */
export declare function finalizeAuditTrail(ctx: MindTraceRunContext): Promise<void>;
/**
 * Historical run indexing hook (placeholder).
 * Appends a single JSON line into history/run-index.jsonl
 */
export declare function indexHistoricalRun(ctx: MindTraceRunContext): Promise<void>;
/**
 * Report bundling hook (placeholder).
 */
export declare function generateReportBundle(ctx: MindTraceRunContext): Promise<void>;
//# sourceMappingURL=runtimePipeline.d.ts.map