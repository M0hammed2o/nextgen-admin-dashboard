import { describe, it, expect } from "vitest";
import { randsToCents, centsToRandsInput, formatCentsAsRands } from "./money";

describe("randsToCents", () => {
  it("converts a plain rand amount to cents", () => {
    expect(randsToCents("1234.5")).toBe(123450);
    expect(randsToCents("1234.50")).toBe(123450);
    expect(randsToCents("99")).toBe(9900);
    expect(randsToCents("0")).toBe(0);
  });

  it("sums 0.1 + 0.2 rand exactly, with no float drift", () => {
    expect(randsToCents("0.1") + randsToCents("0.2")).toBe(30);
  });

  it("trims surrounding whitespace", () => {
    expect(randsToCents("  50.00  ")).toBe(5000);
  });

  it("rejects more than 2 decimal places", () => {
    expect(() => randsToCents("1.234")).toThrow();
  });

  it("rejects negative amounts", () => {
    expect(() => randsToCents("-5")).toThrow();
    expect(() => randsToCents("-5.00")).toThrow();
  });

  it("rejects garbage input", () => {
    expect(() => randsToCents("abc")).toThrow();
    expect(() => randsToCents("")).toThrow();
    expect(() => randsToCents("R 50")).toThrow();
    expect(() => randsToCents("1,234.50")).toThrow();
    expect(() => randsToCents("1e5")).toThrow();
  });
});

describe("centsToRandsInput", () => {
  it("round-trips through randsToCents", () => {
    expect(centsToRandsInput(123450)).toBe("1234.50");
    expect(centsToRandsInput(9900)).toBe("99.00");
    expect(centsToRandsInput(5)).toBe("0.05");
    expect(centsToRandsInput(0)).toBe("0.00");
  });
});

describe("formatCentsAsRands", () => {
  it("formats with a space thousands separator and dot decimal", () => {
    expect(formatCentsAsRands(123450)).toBe("R 1 234.50");
    expect(formatCentsAsRands(1234550)).toBe("R 12 345.50");
    expect(formatCentsAsRands(0)).toBe("R 0.00");
    expect(formatCentsAsRands(9900)).toBe("R 99.00");
  });

  it("formats a negative amount with a leading minus before R", () => {
    expect(formatCentsAsRands(-500)).toBe("-R 5.00");
  });
});
