// mindtrace-ai-runtime/src/contract-awareness/__tests__/helpers.test.ts
import { createIssue, getSeverity, issuesBySeverity } from "../helpers";
import type { ContractAwarenessIssue } from "../types";

describe("Error Helpers", () => {
  describe("createIssue", () => {
    it("creates contract issue with ERROR severity", () => {
      const issue = createIssue("CA_MISSING_FILE", "test.json not found");
      expect(issue.code).toBe("CA_MISSING_FILE");
      expect(issue.category).toBe("contract");
      expect(issue.severity).toBe("ERROR");
      expect(issue.message).toBe("test.json not found");
    });

    it("creates cache issue with WARN severity", () => {
      const issue = createIssue("CA_CACHE_HASH_MISMATCH", "hash mismatch");
      expect(issue.code).toBe("CA_CACHE_HASH_MISMATCH");
      expect(issue.category).toBe("cache");
      expect(issue.severity).toBe("WARN");
    });

    it("includes optional context", () => {
      const issue = createIssue("CA_MISSING_FILE", "not found", { file: "test.json" });
      expect(issue.context).toEqual({ file: "test.json" });
    });
  });

  describe("getSeverity", () => {
    it("returns ERROR for contract errors", () => {
      expect(getSeverity("CA_MISSING_FILE")).toBe("ERROR");
      expect(getSeverity("CA_SCHEMA_INVALID")).toBe("ERROR");
    });

    it("returns WARN for cache errors", () => {
      expect(getSeverity("CA_CACHE_HASH_MISMATCH")).toBe("WARN");
      expect(getSeverity("CA_CACHE_DIR_MISSING")).toBe("WARN");
    });

    it("returns WARN for legacy path warning", () => {
      expect(getSeverity("CA_LEGACY_PATH")).toBe("WARN");
    });
  });

  describe("issuesBySeverity", () => {
    it("groups issues by severity", () => {
      const issues: ContractAwarenessIssue[] = [
        createIssue("CA_MISSING_FILE", "error1"),
        createIssue("CA_CACHE_HASH_MISMATCH", "warn1"),
        createIssue("CA_SCHEMA_INVALID", "error2"),
      ];
      const grouped = issuesBySeverity(issues);
      expect(grouped.ERROR).toHaveLength(2);
      expect(grouped.WARN).toHaveLength(1);
    });

    it("handles empty arrays", () => {
      const grouped = issuesBySeverity([]);
      expect(grouped.ERROR).toHaveLength(0);
      expect(grouped.WARN).toHaveLength(0);
    });
  });
});
