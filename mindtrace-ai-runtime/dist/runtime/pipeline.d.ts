export type MindTraceRunContext = {
    cwd: string;
    runName: string;
    outputDir?: string;
    format?: string;
};
export type GovernanceGateContext = MindTraceRunContext & {
    exitCode: number;
};
export type RunLayout = {
    runDir: string;
    artifactsDir: string;
    auditDir: string;
    historyDir: string;
    historyIndexPath: string;
};
export declare function ensureRunLayout(ctx: MindTraceRunContext): RunLayout;
export declare function postRunGenerateArtifacts(ctx: MindTraceRunContext): Promise<void>;
export declare function validateArtifacts(ctx: MindTraceRunContext): Promise<void>;
export declare function governanceGate(ctx: GovernanceGateContext): Promise<void>;
export declare function finalizeAuditTrail(ctx: MindTraceRunContext): Promise<void>;
export declare function indexHistoricalRun(ctx: MindTraceRunContext): Promise<void>;
export declare function generateReportBundle(ctx: MindTraceRunContext): Promise<void>;
//# sourceMappingURL=pipeline.d.ts.map