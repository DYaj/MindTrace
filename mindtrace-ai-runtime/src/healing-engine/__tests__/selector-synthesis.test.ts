// mindtrace-ai-runtime/src/healing-engine/__tests__/selector-synthesis.test.ts
import { synthesizeSelectors } from "../selector-synthesis";
import type { ActionType } from "../types";

describe("Selector Synthesis", () => {
  it("synthesizes testid selectors from stableIds", () => {
    const signals = {
      stableIds: ["login-btn", "submit-btn"],
      roles: [],
      labels: []
    };

    const selectors = synthesizeSelectors(signals, "click");

    expect(selectors).toContainEqual({
      type: "testid",
      selector: "[data-testid='login-btn']"
    });
    expect(selectors).toContainEqual({
      type: "testid",
      selector: "[data-testid='submit-btn']"
    });
  });

  it("synthesizes role selectors from roles array", () => {
    const signals = {
      stableIds: [],
      roles: ["button", "textbox"],
      labels: []
    };

    const selectors = synthesizeSelectors(signals, "click");

    expect(selectors).toContainEqual({
      type: "role",
      selector: "button"
    });
  });

  it("filters selectors incompatible with action type", () => {
    const signals = {
      stableIds: [],
      roles: ["link"], // incompatible with 'fill'
      labels: []
    };

    const selectors = synthesizeSelectors(signals, "fill");

    // link role should be filtered for fill action
    expect(selectors.find(s => s.selector === "link")).toBeUndefined();
  });
});
