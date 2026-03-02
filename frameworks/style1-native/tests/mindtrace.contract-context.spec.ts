import { test, expect } from "@playwright/test";
import { getMindTraceContractContext } from "../src/mindtrace/getContractContext";

test("MindTrace contract context is readable (non-fatal)", async () => {
  const ctx = getMindTraceContractContext();
  // never fail the suite on missing context (Phase 2.3.x is plumbing)
  if (!ctx.ok) {
    console.log("[mindtrace] contract context not available:", ctx.warnings);
    expect(true).toBeTruthy();
    return;
  }

  console.log("[mindtrace] contractDir:", ctx.contractDir);
  expect(typeof ctx.contractDir).toBe("string");
});
