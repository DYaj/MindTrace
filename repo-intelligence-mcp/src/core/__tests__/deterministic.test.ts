import { describe, it, expect } from "vitest";
import { canonicalStringify } from "../deterministic.js";

describe("canonicalStringify", () => {
  it("sorts keys alphabetically at top level", () => {
    const obj = { z: 1, a: 2, m: 3 };
    const result = canonicalStringify(obj);
    expect(result).toBe('{\n  "a": 2,\n  "m": 3,\n  "z": 1\n}');
  });

  it("sorts keys recursively at all depths", () => {
    const obj = {
      z: { b: 1, a: 2 },
      a: { z: 3, m: 4 }
    };
    const result = canonicalStringify(obj);
    const parsed = JSON.parse(result);
    const keys = Object.keys(parsed);
    expect(keys).toEqual(["a", "z"]);
    expect(Object.keys(parsed.z)).toEqual(["a", "b"]);
  });

  it("preserves array order", () => {
    const obj = { arr: [3, 1, 2] };
    const result = canonicalStringify(obj);
    expect(JSON.parse(result).arr).toEqual([3, 1, 2]);
  });

  it("produces identical output for same input", () => {
    const obj1 = { b: 1, a: 2 };
    const obj2 = { a: 2, b: 1 };
    expect(canonicalStringify(obj1)).toBe(canonicalStringify(obj2));
  });
});
