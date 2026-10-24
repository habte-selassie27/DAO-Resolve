import { describe, expect, it } from "vitest";
import {
  mergeProposalIds,
  readRememberedProposals,
  rememberProposal,
} from "../../src/lib/proposalRegistry.js";

describe("mergeProposalIds", () => {
  it("keeps priority order, trims values, and drops duplicates and empties", () => {
    expect(
      mergeProposalIds(["P-001", " P-002 ", ""], ["P-002", "P-003"], undefined, "P-001")
    ).toEqual(["P-001", "P-002", "P-003"]);
  });

  it("returns an empty list for missing input", () => {
    expect(mergeProposalIds()).toEqual([]);
    expect(mergeProposalIds(null, [], ["  "])).toEqual([]);
  });
});

describe("proposal registry", () => {
  it("remembers proposals registered from this browser and ignores duplicates", () => {
    rememberProposal("P-900");
    rememberProposal(" P-900 ");
    rememberProposal("");
    expect(readRememberedProposals()).toEqual(["P-900"]);
  });
});
