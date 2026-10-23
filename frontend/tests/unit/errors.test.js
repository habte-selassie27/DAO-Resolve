import { describe, expect, it } from "vitest";
import { explainError } from "../../src/lib/errors.js";

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
});
