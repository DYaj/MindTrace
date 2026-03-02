import { describe, it, expect } from "vitest";
import { detectPrimaryStyle } from "../detectPrimaryStyle.js";

describe("detectPrimaryStyle", () => {
  it("returns unknown for empty array", () => {
    expect(detectPrimaryStyle([])).toBe("unknown");
  });

  it("selects style3 over style2 and style1", () => {
    const styles = ["style1-native", "style2-bdd", "style3-pom-bdd"];
    expect(detectPrimaryStyle(styles)).toBe("style3-pom-bdd");
  });

  it("selects style2 over style1", () => {
    const styles = ["style1-native", "style2-bdd"];
    expect(detectPrimaryStyle(styles)).toBe("style2-bdd");
  });

  it("uses alphabetical tiebreak for unknown styles", () => {
    const styles = ["style-zebra", "style-alpha"];
    expect(detectPrimaryStyle(styles)).toBe("style-alpha");
  });

  it("is deterministic regardless of input order", () => {
    const styles1 = ["style3-pom-bdd", "style1-native", "style2-bdd"];
    const styles2 = ["style2-bdd", "style3-pom-bdd", "style1-native"];
    expect(detectPrimaryStyle(styles1)).toBe(detectPrimaryStyle(styles2));
  });
});
