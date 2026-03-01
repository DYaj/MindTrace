#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function exists(p) {
  try { fs.accessSync(p, fs.constants.R_OK); return true; } catch { return false; }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default base path = package root (scripts/..)
const defaultBase = path.resolve(__dirname, "..");
const base = process.env.MINDTRACE_BASE_PATH
  ? path.resolve(process.env.MINDTRACE_BASE_PATH)
  : defaultBase;

const promptsDir = path.join(base, "prompts");
const contractsDir = path.join(base, "contracts");
const schemasDir = path.join(contractsDir, "schemas");
const examplesDir = path.join(contractsDir, "examples");

const checks = [
  ["BASE", base],
  ["prompts/", promptsDir],
  ["contracts/", contractsDir],
  ["contracts/schemas/", schemasDir],
  ["contracts/examples/", examplesDir],
];

let ok = true;
for (const [label, p] of checks) {
  const good = exists(p);
  if (!good) ok = false;
  console.log(`${good ? "✅" : "❌"} ${label}: ${p}`);
}

if (exists(promptsDir)) {
  console.log("PROMPTS_DIR entries:", fs.readdirSync(promptsDir));
}

if (!ok) {
  console.error("\n❌ Packaged smoke test FAILED: missing required packaged assets.");
  process.exit(1);
}

console.log("\n✅ Packaged smoke test OK");
