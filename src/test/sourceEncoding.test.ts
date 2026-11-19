import { describe, it, expect } from "vitest";

// Regression guard (souk e2e run 2026-11-19): a cp1252 em dash (byte 0x97) in
// EventVendorsTab.tsx rendered as U+FFFD in the shared-claim warning. Vite
// reads source as UTF-8, so any non-UTF-8 byte in a source file surfaces here
// as the replacement character.
const REPLACEMENT_CHAR = String.fromCharCode(0xfffd);
const sources = import.meta.glob("/src/**/*.{ts,tsx,css}", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

describe("source encoding", () => {
  it("loads source files", () => {
    expect(Object.keys(sources).length).toBeGreaterThan(50);
  });

  it("has no file that decodes to the U+FFFD replacement character", () => {
    const bad = Object.entries(sources).filter(([, text]) => text.includes(REPLACEMENT_CHAR)).map(([file]) => file);
    expect(bad).toEqual([]);
  });
});
