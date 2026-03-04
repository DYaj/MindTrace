// mindtrace-ai-runtime/src/healing-engine/__tests__/candidate-id.test.ts
import { generateCandidateId } from "../candidate-id";

describe("Candidate ID Generator", () => {
  it("generates stable hash for same inputs", () => {
    const id1 = generateCandidateId({
      tier: "contract",
      locatorType: "testid",
      selector: "[data-testid='login-btn']",
      pageKey: "login"
    });

    const id2 = generateCandidateId({
      tier: "contract",
      locatorType: "testid",
      selector: "[data-testid='login-btn']",
      pageKey: "login"
    });

    expect(id1).toBe(id2);
    expect(id1).toMatch(/^contract_testid_[a-f0-9]{16}$/);
  });

  it("generates different IDs for different selectors", () => {
    const id1 = generateCandidateId({
      tier: "contract",
      locatorType: "testid",
      selector: "[data-testid='btn1']"
    });

    const id2 = generateCandidateId({
      tier: "contract",
      locatorType: "testid",
      selector: "[data-testid='btn2']"
    });

    expect(id1).not.toBe(id2);
  });

  it("generates different IDs for different tiers", () => {
    const id1 = generateCandidateId({
      tier: "contract",
      locatorType: "testid",
      selector: "[data-testid='btn']"
    });

    const id2 = generateCandidateId({
      tier: "cache",
      locatorType: "testid",
      selector: "[data-testid='btn']"
    });

    expect(id1).not.toBe(id2);
  });

  it("generates different IDs for different locator types", () => {
    const id1 = generateCandidateId({
      tier: "contract",
      locatorType: "testid",
      selector: "[data-testid='btn']"
    });

    const id2 = generateCandidateId({
      tier: "contract",
      locatorType: "role",
      selector: "[data-testid='btn']"
    });

    expect(id1).not.toBe(id2);
  });

  it("normalizes selectors for consistent hashing", () => {
    const id1 = generateCandidateId({
      tier: "contract",
      locatorType: "testid",
      selector: "  [DATA-TESTID='BTN']  "
    });

    const id2 = generateCandidateId({
      tier: "contract",
      locatorType: "testid",
      selector: "[data-testid='btn']"
    });

    expect(id1).toBe(id2);
  });

  it("handles whitespace collapse in normalization", () => {
    const id1 = generateCandidateId({
      tier: "contract",
      locatorType: "text",
      selector: "Click   here   now"
    });

    const id2 = generateCandidateId({
      tier: "contract",
      locatorType: "text",
      selector: "click here now"
    });

    expect(id1).toBe(id2);
  });

  it("includes pageKey in hash when provided", () => {
    const id1 = generateCandidateId({
      tier: "contract",
      locatorType: "testid",
      selector: "[data-testid='btn']",
      pageKey: "page1"
    });

    const id2 = generateCandidateId({
      tier: "contract",
      locatorType: "testid",
      selector: "[data-testid='btn']",
      pageKey: "page2"
    });

    expect(id1).not.toBe(id2);
  });

  it("treats undefined pageKey same as empty string", () => {
    const id1 = generateCandidateId({
      tier: "contract",
      locatorType: "testid",
      selector: "[data-testid='btn']"
    });

    const id2 = generateCandidateId({
      tier: "contract",
      locatorType: "testid",
      selector: "[data-testid='btn']",
      pageKey: ""
    });

    expect(id1).toBe(id2);
  });
});
