import { describe, it, expect } from "vitest";
import { parsePositiveInt } from "../src/validate.js";

describe("parsePositiveInt", () => {
  it("parses valid positive integer", () => {
    expect(parsePositiveInt("10")).toBe(10);
  });

  it("parses single digit", () => {
    expect(parsePositiveInt("1")).toBe(1);
  });

  it("parses large number", () => {
    expect(parsePositiveInt("2026")).toBe(2026);
  });

  it("throws on non-numeric string", () => {
    expect(() => parsePositiveInt("foo")).toThrow("not a positive integer");
  });

  it("throws on empty string", () => {
    expect(() => parsePositiveInt("")).toThrow("not a positive integer");
  });

  it("throws on zero", () => {
    expect(() => parsePositiveInt("0")).toThrow("not a positive integer");
  });

  it("throws on negative number", () => {
    expect(() => parsePositiveInt("-5")).toThrow("not a positive integer");
  });

  it("throws on float string", () => {
    expect(() => parsePositiveInt("3.14")).toThrow();
  });
});
