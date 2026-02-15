"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
function ensureDir(p) {
    if (!(0, fs_1.existsSync)(p))
        (0, fs_1.mkdirSync)(p, { recursive: true });
}
function ensureRunLayout(runName, baseDir) {
    const resolvedBase = baseDir ? (0, path_1.resolve)(baseDir) : (0, path_1.resolve)(process.cwd());
    const runsDir = (0, path_1.join)(resolvedBase, "runs");
    const runDir = (0, path_1.join)(runsDir, runName);
    const artifactsDir = (0, path_1.join)(runDir, "artifacts");
    const auditDir = (0, path_1.join)(runDir, "audit");
    const historyDir = (0, path_1.join)(resolvedBase, "history");
    ensureDir(runsDir);
    ensureDir(runDir);
    ensureDir(artifactsDir);
    ensureDir(auditDir);
    ensureDir(historyDir);
    // minimal metadata for traceability (safe/no breaking)
    const metaPath = (0, path_1.join)(runDir, "run.json");
    if (!(0, fs_1.existsSync)(metaPath)) {
        (0, fs_1.writeFileSync)(metaPath, JSON.stringify({
            runName,
            createdAt: new Date().toISOString(),
            baseDir: resolvedBase
        }, null, 2));
    }
    return {
        runName,
        baseDir: resolvedBase,
        runsDir,
        runDir,
        artifactsDir,
        auditDir,
        historyDir
    };
}
/**
 * Post-run artifact generation hook.
 * Minimal placeholder: ensures directories exist. Real generation can be wired later.
 */
async function postRunGenerateArtifacts(ctx) {
    ensureDir(ctx.artifactsDir);
}
/**
 * Artifact validation hook (placeholder).
 * In a stricter implementation, you’d check required artifact files/JSON schemas.
 */
async function validateArtifacts(ctx) {
    ensureDir(ctx.artifactsDir);
}
/**
 * Governance gate hook (placeholder).
 * In a strict implementation, you’d read RCA results and decide pass/fail.
 */
async function governanceGate(ctx) {
    // noop (do not break existing pipeline)
}
/**
 * Audit trail finalization hook (placeholder).
 * Creates empty ndjson/final.json if missing to avoid downstream failures.
 */
async function finalizeAuditTrail(ctx) {
    ensureDir(ctx.auditDir);
    const eventsPath = (0, path_1.join)(ctx.auditDir, "events.ndjson");
    if (!(0, fs_1.existsSync)(eventsPath)) {
        (0, fs_1.writeFileSync)(eventsPath, "");
    }
    const finalPath = (0, path_1.join)(ctx.auditDir, "final.json");
    if (!(0, fs_1.existsSync)(finalPath)) {
        (0, fs_1.writeFileSync)(finalPath, JSON.stringify({
            runName: ctx.runName,
            finalizedAt: new Date().toISOString()
        }, null, 2));
    }
}
/**
 * Historical run indexing hook (placeholder).
 * Appends a single JSON line into history/run-index.jsonl
 */
async function indexHistoricalRun(ctx) {
    ensureDir(ctx.historyDir);
    const indexPath = (0, path_1.join)(ctx.historyDir, "run-index.jsonl");
    const line = JSON.stringify({
        runName: ctx.runName,
        runDir: ctx.runDir,
        indexedAt: new Date().toISOString()
    }, null, 0) + "\n";
    // append without importing fs/promises to keep this minimal + compatible
    const fs = await Promise.resolve().then(() => __importStar(require("fs")));
    fs.appendFileSync(indexPath, line);
}
/**
 * Report bundling hook (placeholder).
 */
async function generateReportBundle(ctx) {
    // noop (report generation handled elsewhere)
}
//# sourceMappingURL=runtimePipeline.js.map