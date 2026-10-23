import { describe, expect, it } from "vitest";
import { explainError, isNetworkError } from "../../src/lib/errors.js";

describe("explainError", () => {
  it("maps authorization failures", () => {
    const result = explainError("EXPECTED: caller is not authorized");
    expect(result.message).toContain("role");
    expect(result.raw).toContain("caller is not authorized");
  });

  it("explains a closed challenge window", () => {
    expect(explainError("EXPECTED: challenge window closed").action).toContain("finalized");
  });

  it("keeps unknown errors honest", () => {
    const result = explainError("weird failure");
    expect(result.message).toContain("unexpected");
    expect(result.raw).toBe("weird failure");
  });

  it("explains undetermined consensus", () => {
    expect(explainError("TRANSIENT: no agreement").message).toContain("timed out");
  });

  it("maps browser network failures instead of blaming the user", () => {
    const result = explainError("TypeError: Failed to fetch");
    expect(result.message).toContain("network request failed");
    expect(result.message).toContain("Nothing was changed");
    expect(result.raw).toBe("TypeError: Failed to fetch");
  });

  it("keeps contract-prefixed errors ahead of the network fallback", () => {
    expect(explainError("EXPECTED: caller is not authorized").message).toContain("role");
  });
});

describe("isNetworkError", () => {
  it("recognizes fetch and proxy failures", () => {
    for (const message of [
      "Failed to fetch",
      "NetworkError when attempting to fetch resource.",
      "Request failed with status code 502",
      "socket hang up",
      "ECONNRESET",
    ]) {
      expect(isNetworkError(message)).toBe(true);
    }
  });

  it("does not match contract errors or ordinary text", () => {
    for (const message of [
      "EXPECTED: invalid state transition",
      "LLM_ERROR: unknown verdict value",
      "weird failure",
      "",
    ]) {
      expect(isNetworkError(message)).toBe(false);
    }
  });
});
