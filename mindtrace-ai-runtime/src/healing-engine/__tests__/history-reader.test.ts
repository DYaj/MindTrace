// mindtrace-ai-runtime/src/healing-engine/__tests__/history-reader.test.ts
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { HistoryReader } from "../history-reader";

describe("HistoryReader", () => {
  const testHistoryPath = "test-run-index.jsonl";

  beforeEach(() => {
    if (existsSync(testHistoryPath)) {
      unlinkSync(testHistoryPath);
    }
  });

  afterEach(() => {
    if (existsSync(testHistoryPath)) {
      unlinkSync(testHistoryPath);
    }
  });

  it("scans recent runs (bounded scan)", () => {
    // Write test history
    const run1 = JSON.stringify({ runId: "run_1", framework: "style1-native", primaryStyle: "native" });
    const run2 = JSON.stringify({ runId: "run_2", framework: "style1-native", primaryStyle: "native" });

    writeFileSync(testHistoryPath, run1 + "\n" + run2 + "\n");

    const reader = new HistoryReader(testHistoryPath);
    const recentRuns = reader.scanRecentRuns({
      framework: "style1-native",
      primaryStyle: "native"
    });

    expect(recentRuns.length).toBe(2);
    expect(recentRuns[0].runId).toBe("run_2"); // most recent first
  });

  it("enforces bounded scan (max 50k lines)", () => {
    // Write large history
    const lines = Array.from({ length: 60000 }, (_, i) =>
      JSON.stringify({ runId: `run_${i}`, framework: "style1-native", primaryStyle: "native" })
    ).join("\n");

    writeFileSync(testHistoryPath, lines);

    const reader = new HistoryReader(testHistoryPath);
    const recentRuns = reader.scanRecentRuns({
      framework: "style1-native",
      primaryStyle: "native"
    });

    // Should only scan last 50k lines
    expect(recentRuns.length).toBeLessThanOrEqual(50000);
  });
});
