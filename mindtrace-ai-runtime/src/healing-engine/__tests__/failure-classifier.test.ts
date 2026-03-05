// mindtrace-ai-runtime/src/healing-engine/__tests__/failure-classifier.test.ts

import { classifyFailure } from "../failure-classifier";

describe("classifyFailure", () => {
  it("should classify selector missing errors as healable", () => {
    const error = new Error(
      'locator.click: Error: strict mode violation: getByTestId("submit-btn") resolved to 0 elements'
    );
    const result = classifyFailure(error);

    expect(result.category).toBe("selectorMissing");
    expect(result.healable).toBe(true);
    expect(result.confidence).toBe(1.0);
    expect(result.reasonCode).toBe("SELECTOR_MISSING");
    expect(result.matchedPatterns).toContain("resolved to 0 elements");
  });

  it("should classify assertion errors as non-healable", () => {
    const error = new Error('expect(received).toBe(expected)\nExpected: 5\nReceived: 3');
    const result = classifyFailure(error);

    expect(result.category).toBe("assertion");
    expect(result.healable).toBe(false);
    expect(result.confidence).toBe(1.0);
    expect(result.reasonCode).toBe("ASSERTION_FAILED");
  });

  it("should classify element detached errors as healable", () => {
    const error = new Error("Element is not attached to the DOM");
    const result = classifyFailure(error);

    expect(result.category).toBe("elementDetached");
    expect(result.healable).toBe(true);
    expect(result.confidence).toBe(1.0);
    expect(result.reasonCode).toBe("ELEMENT_DETACHED");
  });

  it("should produce stable fingerprints for identical errors", () => {
    const error1 = new Error("  Selector not found: #button  ");
    const error2 = new Error("Selector not found: #button");

    const result1 = classifyFailure(error1);
    const result2 = classifyFailure(error2);

    expect(result1.errorFingerprint).toBe(result2.errorFingerprint);
  });

  it("should classify timeout errors as healable (selector-related)", () => {
    const error = new Error("Timeout 30000ms exceeded while waiting for selector");
    const result = classifyFailure(error);
    expect(result.category).toBe("timeout");
    expect(result.healable).toBe(true);
    expect(result.confidence).toBe(1.0);
  });

  it("should classify network4xx as non-healable", () => {
    const error = new Error("net::ERR_FAILED at https://example.com/api");
    const result = classifyFailure(error);
    expect(result.category).toBe("network4xx");
    expect(result.healable).toBe(false);
  });

  it("should classify environment errors as non-healable", () => {
    const error = new Error("ECONNREFUSED - connection refused");
    const result = classifyFailure(error);
    expect(result.category).toBe("environment");
    expect(result.healable).toBe(false);
  });

  it("should classify test code errors as non-healable", () => {
    const error = new Error("TypeError: page.clck is not a function");
    const result = classifyFailure(error);
    expect(result.category).toBe("testCodeError");
    expect(result.healable).toBe(false);
  });

  it("should classify unknown errors with confidence 0.0", () => {
    const error = new Error("Something completely unexpected");
    const result = classifyFailure(error);
    expect(result.category).toBe("unknown");
    expect(result.healable).toBe(false);
    expect(result.confidence).toBe(0.0);
  });

  it("should handle empty error messages", () => {
    const error = new Error("");
    const result = classifyFailure(error);
    expect(result.category).toBe("unknown");
    expect(result.healable).toBe(false);
  });

  it("should handle messages with excessive whitespace", () => {
    const error1 = new Error("  Selector   not   found  ");
    const error2 = new Error("Selector not found");
    expect(classifyFailure(error1).errorFingerprint)
      .toBe(classifyFailure(error2).errorFingerprint);
  });

  it("should prioritize assertion over timeout when both patterns match", () => {
    const error = new Error("expect(page).toBeVisible() timeout waiting for selector");
    const result = classifyFailure(error);
    expect(result.category).toBe("assertion");
    expect(result.healable).toBe(false);
  });
});
