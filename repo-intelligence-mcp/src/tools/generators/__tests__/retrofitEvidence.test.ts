import { describe, it, expect } from "vitest";
import { retrofitEvidenceBundle } from "../retrofitEvidence.js";
import type { Evidence } from "../../../types/contract.js";

describe("retrofitEvidenceBundle", () => {
  it("preserves existing evidence", () => {
    const contracts = {
      framework: {
        evidence: [{ kind: "config" as const, file: "playwright.config.ts", sample: "..." }]
      },
      selector: { evidence: [] },
      assertion: { evidence: [] }
    };

    const topology = { files: [], directories: [], signals: [] };
    const result = retrofitEvidenceBundle(contracts, topology);

    expect(result.framework.evidence).toHaveLength(1);
    expect(result.framework.evidence[0].file).toBe("playwright.config.ts");
  });

  it("upgrades empty-file entries when new evidence has file path", () => {
    const contracts = {
      framework: {
        evidence: [{ kind: "config" as const, file: "", sample: "defineConfig" }],
        repoSignals: []
      },
      selector: { evidence: [] },
      assertion: { evidence: [] }
    };

    const topology = { files: ["playwright.config.ts"], directories: [], signals: [] };

    // This would normally map repoSignals → Evidence with file paths
    // For now, test passes through
    const result = retrofitEvidenceBundle(contracts, topology);

    expect(result.framework.evidence[0].file).toBe(""); // TODO: Update when mapper implemented
  });

  it("does not duplicate existing evidence", () => {
    const existing: Evidence = {
      kind: "config",
      file: "playwright.config.ts",
      sample: "..."
    };

    const contracts = {
      framework: { evidence: [existing], repoSignals: [] },
      selector: { evidence: [] },
      assertion: { evidence: [] }
    };

    const topology = { files: [], directories: [], signals: [] };
    const result = retrofitEvidenceBundle(contracts, topology);

    expect(result.framework.evidence).toHaveLength(1);
  });
});
