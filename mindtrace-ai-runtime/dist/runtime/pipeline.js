"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureRunLayout = ensureRunLayout;
exports.postRunGenerateArtifacts = postRunGenerateArtifacts;
exports.validateArtifacts = validateArtifacts;
exports.governanceGate = governanceGate;
exports.finalizeAuditTrail = finalizeAuditTrail;
exports.indexHistoricalRun = indexHistoricalRun;
exports.generateReportBundle = generateReportBundle;
const fs_1 = require("fs");
const path_1 = require("path");
function ensureRunLayout(ctx) {
    const runDir = (0, path_1.join)(ctx.cwd, "runs", ctx.runName);
    const artifactsDir = (0, path_1.join)(runDir, "artifacts");
    const auditDir = (0, path_1.join)(runDir, "audit");
    const historyDir = (0, path_1.join)(ctx.cwd, "history");
    const historyIndexPath = (0, path_1.join)(historyDir, "run-index.jsonl");
    (0, fs_1.mkdirSync)(runDir, { recursive: true });
    (0, fs_1.mkdirSync)(artifactsDir, { recursive: true });
    (0, fs_1.mkdirSync)(auditDir, { recursive: true });
    (0, fs_1.mkdirSync)(historyDir, { recursive: true });
    return { runDir, artifactsDir, auditDir, historyDir, historyIndexPath };
}
async function postRunGenerateArtifacts(ctx) {
    const layout = ensureRunLayout(ctx);
    const healedPath = (0, path_1.join)(layout.artifactsDir, "healed-selectors.json");
    const rcaPath = (0, path_1.join)(layout.artifactsDir, "root-cause-summary.json");
    const narrativePath = (0, path_1.join)(layout.artifactsDir, "failure-narrative.md");
    const traceMapPath = (0, path_1.join)(layout.artifactsDir, "execution-trace-map.json");
    if (!(0, fs_1.existsSync)(healedPath)) {
        (0, fs_1.writeFileSync)(healedPath, JSON.stringify({ selectors: [] }, null, 2), "utf-8");
    }
    if (!(0, fs_1.existsSync)(rcaPath)) {
        (0, fs_1.writeFileSync)(rcaPath, JSON.stringify({ category: "none", confidence: 1, isFlaky: false }, null, 2), "utf-8");
    }
    if (!(0, fs_1.existsSync)(narrativePath)) {
        (0, fs_1.writeFileSync)(narrativePath, "# Failure Narrative\n\nNo failures detected.\n", "utf-8");
    }
    if (!(0, fs_1.existsSync)(traceMapPath)) {
        (0, fs_1.writeFileSync)(traceMapPath, JSON.stringify({ steps: [] }, null, 2), "utf-8");
    }
}
async function validateArtifacts(ctx) {
    const layout = ensureRunLayout(ctx);
    const required = ["healed-selectors.json", "root-cause-summary.json", "failure-narrative.md", "execution-trace-map.json"];
    for (const f of required) {
        const p = (0, path_1.join)(layout.artifactsDir, f);
        if (!(0, fs_1.existsSync)(p)) {
            throw new Error(`Missing required artifact: ${p}`);
        }
    }
    const jsonFiles = ["healed-selectors.json", "root-cause-summary.json", "execution-trace-map.json"];
    for (const f of jsonFiles) {
        const p = (0, path_1.join)(layout.artifactsDir, f);
        try {
            JSON.parse((0, fs_1.readFileSync)(p, "utf-8"));
        }
        catch {
            throw new Error(`Invalid JSON artifact: ${p}`);
        }
    }
}
async function governanceGate(ctx) {
    const layout = ensureRunLayout(ctx);
    const rcaPath = (0, path_1.join)(layout.artifactsDir, "root-cause-summary.json");
    const rcaRaw = (0, fs_1.existsSync)(rcaPath) ? (0, fs_1.readFileSync)(rcaPath, "utf-8") : "{}";
    const rca = JSON.parse(rcaRaw || "{}");
    const isFlaky = Boolean(rca.isFlaky);
    if (ctx.exitCode !== 0 && !isFlaky) {
        throw new Error(`Governance gate failed: exitCode=${ctx.exitCode}, isFlaky=${isFlaky}`);
    }
}
async function finalizeAuditTrail(ctx) {
    const layout = ensureRunLayout(ctx);
    const eventsPath = (0, path_1.join)(layout.auditDir, "events.ndjson");
    const finalPath = (0, path_1.join)(layout.auditDir, "final.json");
    const event = {
        ts: new Date().toISOString(),
        runName: ctx.runName,
        type: "finalize"
    };
    (0, fs_1.appendFileSync)(eventsPath, JSON.stringify(event) + "\n", "utf-8");
    const final = {
        runName: ctx.runName,
        finalizedAt: new Date().toISOString(),
        eventsPath
    };
    (0, fs_1.writeFileSync)(finalPath, JSON.stringify(final, null, 2), "utf-8");
}
async function indexHistoricalRun(ctx) {
    const layout = ensureRunLayout(ctx);
    const rcaPath = (0, path_1.join)(layout.artifactsDir, "root-cause-summary.json");
    const rcaRaw = (0, fs_1.existsSync)(rcaPath) ? (0, fs_1.readFileSync)(rcaPath, "utf-8") : "{}";
    const rca = JSON.parse(rcaRaw || "{}");
    const record = {
        ts: new Date().toISOString(),
        runName: ctx.runName,
        category: rca.category ?? "unknown",
        confidence: rca.confidence ?? 0,
        isFlaky: Boolean(rca.isFlaky)
    };
    (0, fs_1.appendFileSync)(layout.historyIndexPath, JSON.stringify(record) + "\n", "utf-8");
}
async function generateReportBundle(ctx) {
    const layout = ensureRunLayout(ctx);
    const reportDir = ctx.outputDir ? (0, path_1.join)(ctx.cwd, ctx.outputDir) : (0, path_1.join)(ctx.cwd, "reports");
    (0, fs_1.mkdirSync)(reportDir, { recursive: true });
    const rcaPath = (0, path_1.join)(layout.artifactsDir, "root-cause-summary.json");
    const narrativePath = (0, path_1.join)(layout.artifactsDir, "failure-narrative.md");
    const rcaRaw = (0, fs_1.existsSync)(rcaPath) ? (0, fs_1.readFileSync)(rcaPath, "utf-8") : "{}";
    const narrative = (0, fs_1.existsSync)(narrativePath) ? (0, fs_1.readFileSync)(narrativePath, "utf-8") : "No narrative.\n";
    const out = [`# MindTrace Report`, ``, `Run: **${ctx.runName}**`, ``, `## Failure Narrative`, narrative.trim(), ``, `## RCA Summary`, "```json", rcaRaw.trim(), "```", ``].join("\n");
    (0, fs_1.writeFileSync)((0, path_1.join)(reportDir, `mindtrace-report-${ctx.runName}.md`), out, "utf-8");
}
//# sourceMappingURL=pipeline.js.map