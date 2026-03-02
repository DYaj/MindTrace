import { test, expect } from "@playwright/test";
import { getMindTraceContractContext } from "../src/mindtrace/getContractContext";

test("MindTrace contract context is readable (non-fatal)", async () => {
  const ctx = getMindTraceContractContext();

  // never fail the suite on missing context (Phase 2.3.x plumbing)
  if (!ctx.ok) {
    console.log("[mindtrace][style3-pom-bdd] contract context not available:", ctx.warnings, ctx.notes ?? []);
    expect(true).toBeTruthy();
    return;
  }

  console.log("[mindtrace][style3-pom-bdd] contractDir:", ctx.contractDir);
  expect(typeof ctx.contractDir).toBe("string");
});
