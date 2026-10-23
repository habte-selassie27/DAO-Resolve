import { describe, expect, it } from "vitest";
import {
  formatDuration,
  isExpired,
  shortAddress,
  timeUntil,
  titleCase,
} from "../../src/lib/format.js";

describe("format helpers", () => {
  it("shortens addresses without hiding the ends", () => {
    expect(shortAddress("0x1234567890abcdef")).toBe("0x1234…cdef");
  });

  it("formats durations at boundaries", () => {
    expect(formatDuration(59)).toBe("59s");
    expect(formatDuration(60)).toBe("1m 0s");
    expect(formatDuration(3600)).toBe("1h 0m");
    expect(formatDuration(86400)).toBe("1d 0h");
  });

  it("detects expired deadlines", () => {
    expect(isExpired(Math.floor(Date.now() / 1000) - 10)).toBe(true);
    expect(isExpired(Math.floor(Date.now() / 1000) + 1000)).toBe(false);
    expect(isExpired(0)).toBe(false);
  });

  it("returns closed for a past deadline", () => {
    expect(timeUntil(Math.floor(Date.now() / 1000) - 10)).toBe("closed");
  });

  it("title-cases enum labels", () => {
    expect(titleCase("RE_EVALUATED")).toBe("Re Evaluated");
    expect(titleCase("OPEN")).toBe("Open");
  });
});
