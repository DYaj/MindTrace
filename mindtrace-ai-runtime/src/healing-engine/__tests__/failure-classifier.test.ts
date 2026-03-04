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
});
