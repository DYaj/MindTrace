import { describe, it, expect } from "vitest";
import { toPosix } from "../normalization.js";

describe("toPosix", () => {
  it("converts Windows paths to POSIX", () => {
    expect(toPosix("src\\pages\\Login.ts")).toBe("src/pages/Login.ts");
  });

  it("strips leading ./", () => {
    expect(toPosix("./src/pages/Login.ts")).toBe("src/pages/Login.ts");
  });

  it("normalizes double slashes", () => {
    expect(toPosix("src//pages//Login.ts")).toBe("src/pages/Login.ts");
  });

  it("handles mixed separators", () => {
    expect(toPosix(".\\src\\\\pages//Login.ts")).toBe("src/pages/Login.ts");
  });

  it("handles already normalized paths", () => {
    expect(toPosix("src/pages/Login.ts")).toBe("src/pages/Login.ts");
  });
});
