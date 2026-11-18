import { describe, it, expect } from "vitest";
import { csvCell, dayRange, formatRands, mergeRange, randsToCents } from "./events";

describe("events helpers", () => {
  it("formats cents as rands", () => {
    expect(formatRands(190000)).toBe("R 1 900.00");
    expect(formatRands(5)).toBe("R 0.05");
    expect(formatRands(null)).toBe("—");
  });
  it("parses rand input to cents", () => {
    expect(randsToCents("100.00")).toBe(10000);
    expect(randsToCents("50.5")).toBe(5050);
    expect(randsToCents("abc")).toBeNull();
    expect(randsToCents("-1")).toBeNull();
  });
  it("builds inclusive day ranges and merges without overriding existing flags", () => {
    expect(dayRange("2026-02-27", "2026-03-02")).toEqual(["2026-02-27", "2026-02-28", "2026-03-01", "2026-03-02"]);
    expect(dayRange("2026-03-02", "2026-03-01")).toEqual([]);
    expect(mergeRange([{ day: "2026-12-02", is_billable: false }], "2026-12-01", "2026-12-03")).toEqual([
      { day: "2026-12-01", is_billable: true },
      { day: "2026-12-02", is_billable: false },
      { day: "2026-12-03", is_billable: true },
    ]);
  });
  it("quotes CSV cells without altering content", () => {
    expect(csvCell('a"b')).toBe('"a""b"');
    expect(csvCell("=x+1")).toBe('"=x+1"');
  });
});
