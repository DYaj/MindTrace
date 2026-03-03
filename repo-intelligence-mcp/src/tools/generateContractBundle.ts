import * as path from "node:path";
import * as fs from "node:fs/promises";
import { generateAutomationContract } from "./generators/generateAutomationContract.js";
import { generatePageKeyPolicy } from "./generators/generatePageKeyPolicy.js";
import { generateContractMeta } from "./generators/generateContractMeta.js";
import { retrofitEvidenceBundle } from "./generators/retrofitEvidence.js";
import { writeContractBundle } from "../contracts/writeContractBundle.js";
import { validateContractBundle } from "../contracts/validateContractBundle.js";
import { computeContractFingerprint } from "./fingerprintContract.js";
import { resolveContractDir } from "../core/paths.js";
import { scanRepo } from "./scanRepo.js";
import type { RepoTopologyJSON } from "../schemas/types.js";

export type GenerateContractBundleResult =
  | { ok: true; hash: string; filesWritten: string[] }
  | { ok: false; error: string };

/**
 * Main coordinator: orchestrates full contract generation pipeline.
 *
 * Pipeline: scan → detect → generate → retrofit → write → validate → fingerprint
 *
 * @param params - { repoRoot: string; mode?: "strict" | "best_effort" }
 * @returns Result with hash and files written, or error
 */
export async function generateContractBundle(params: {
  repoRoot: string;
  mode?: "strict" | "best_effort";
}): Promise<GenerateContractBundleResult> {
  const mode = params.mode ?? "best_effort";

  try {
    // Step 1: Scan repo with real implementation
    const topology = await scanRepo({
      rootPath: params.repoRoot,
      // Use defaults for ignore dirs/globs and limits
    });

    // Step 2: Detect framework, structure, locator style, assertion style (placeholders)
    // TODO: Replace with actual detection functions
    const framework: import("../types/contract.js").DetectFrameworkOutput = {
      framework: "playwright",
      confidence: 0.9,
      signalsUsed: [],
      notes: []
    };

    const structure: import("../types/contract.js").InferStructureOutput = {
      style: "native",
      confidence: 0.8,
      signalsUsed: [],
      structure: {
        pageObjects: {
          present: false,
          paths: [],
          pattern: "unknown"
        },
        bdd: {
          present: false,
          featurePaths: [],
          stepDefPaths: [],
          glueStyle: "unknown"
        }
      }
    };

    const locatorStyle: import("../types/contract.js").DetectLocatorStyleOutput = {
      preferenceOrder: ["role", "css"],
      confidence: 0.85,
      signalsUsed: [],
      orgConventions: {
        stableAttributeKeys: [],
        customLocatorHelpers: []
      }
    };

    const assertionStyle: import("../types/contract.js").DetectAssertionStyleOutput = {
      primary: "expect",
      confidence: 0.9,
      wrappers: [],
      signalsUsed: []
    };

    const stylesDetected = ["style1-native"];
    const entrypoints = [];

    // Step 3: Detect primary style
    const { detectPrimaryStyle } = await import("./generators/detectPrimaryStyle.js");
    const primaryStyle = detectPrimaryStyle(stylesDetected);

    // Step 4: Generate contracts
    const automationContract = generateAutomationContract({
      topology,
      framework,
      structure,
      locatorStyle,
      assertionStyle,
      stylesDetected,
      entrypoints,
      primaryStyle
    });

    const pageKeyPolicy = generatePageKeyPolicy({
      topology,
      stylesDetected
    });

    const contractInputs = [
      "repo-topology.json",
      "framework-pattern.json",
      "selector-strategy.json",
      "assertion-style.json"
    ];

    const contractMeta = generateContractMeta({
      scanResult: topology,
      contractInputs
    });

    // Step 5: Retrofit evidence (using placeholder contracts for now)
    const retrofitted = retrofitEvidenceBundle(
      {
        framework: framework as any,
        selector: locatorStyle as any,
        assertion: assertionStyle as any
      },
      topology
    );

    // Step 6: Write detection artifacts (placeholders for Phase 0)
    const { dir: contractDir, isLegacy } = resolveContractDir(params.repoRoot);

    // Emit warning if legacy path used
    if (isLegacy) {
      console.warn("⚠️  Using legacy contract directory: .mindtrace/contracts/ (migrate to .mcp-contract/)");
    }

    await fs.mkdir(contractDir, { recursive: true });

    // Write placeholder detection artifacts required for fingerprinting
    // TODO: Replace with real detection artifacts in Phase 1
    const { canonicalStringify } = await import("../core/deterministic.js");

    // Write repo-topology.json (exclude scannedAt for deterministic fingerprinting)
    // Note: scannedAt is volatile (timestamp), but contract.meta.json already has generated_at
    const { scannedAt, ...topologyForFingerprint } = topology;
    await fs.writeFile(
      path.join(contractDir, "repo-topology.json"),
      canonicalStringify(topologyForFingerprint),
      "utf-8"
    );

    // framework-pattern.json - conform to schema
    await fs.writeFile(
      path.join(contractDir, "framework-pattern.json"),
      canonicalStringify({
        schema_version: "1.0.0",
        framework: framework.framework,
        confidence: framework.confidence,
        evidence: framework.signalsUsed
      }),
      "utf-8"
    );

    // selector-strategy.json - conform to schema
    await fs.writeFile(
      path.join(contractDir, "selector-strategy.json"),
      canonicalStringify({
        schema_version: "1.0.0",
        preferred: locatorStyle.preferenceOrder,
        wrappers: [],
        evidence: []
      }),
      "utf-8"
    );

    // assertion-style.json - conform to schema
    await fs.writeFile(
      path.join(contractDir, "assertion-style.json"),
      canonicalStringify({
        schema_version: "1.0.0",
        primaryStyle: assertionStyle.primary,
        wrappers: [],
        evidence: []
      }),
      "utf-8"
    );

    // wrapper-discovery.json - no schema validation for now
    await fs.writeFile(
      path.join(contractDir, "wrapper-discovery.json"),
      canonicalStringify({ wrappers: [], confidence: 0, evidence: [] }),
      "utf-8"
    );

    // Step 7: Write contract bundle
    await writeContractBundle({
      contractDir,
      automationContract,
      pageKeyPolicy,
      contractMeta
    });

    // Step 8: Validate
    const validation = await validateContractBundle(contractDir);
    if (!validation.valid) {
      return {
        ok: false,
        error: `Validation failed: ${validation.errors.join(", ")}`
      };
    }

    // Step 9: Read the fingerprint that was written by writeContractBundle
    const hashFile = path.join(contractDir, "contract.fingerprint.sha256");
    const hashContent = await fs.readFile(hashFile, "utf-8");
    const hash = hashContent.trim();

    return {
      ok: true,
      hash,
      filesWritten: [
        "automation-contract.json",
        "contract.fingerprint.sha256",
        "contract.meta.json",
        "page-key-policy.json"
      ]
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
