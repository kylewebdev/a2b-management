import { describe, it, expect } from "vitest";
import {
  DISPOSITIONS,
  DISPOSITION_LABELS,
  VALID_ITEM_TRANSITIONS,
  getRoutingGuidance,
  isValidDisposition,
  isValidItemTransition,
  resolveStatusOnDisposition,
} from "../disposition";

describe("DISPOSITIONS", () => {
  it("contains exactly 4 disposition values", () => {
    expect(DISPOSITIONS).toEqual(["sold_onsite", "bulk_lot", "donated", "trashed"]);
  });
});

describe("DISPOSITION_LABELS", () => {
  it("maps each disposition to a human-readable label", () => {
    expect(DISPOSITION_LABELS.sold_onsite).toBe("Sold Onsite");
    expect(DISPOSITION_LABELS.bulk_lot).toBe("Bulk Lot");
    expect(DISPOSITION_LABELS.donated).toBe("Donated");
    expect(DISPOSITION_LABELS.trashed).toBe("Trashed");
  });
});

describe("VALID_ITEM_TRANSITIONS", () => {
  it("pending can transition to triaged", () => {
    expect(VALID_ITEM_TRANSITIONS.pending).toEqual(["triaged"]);
  });

  it("triaged can transition to routed or resolved", () => {
    expect(VALID_ITEM_TRANSITIONS.triaged).toEqual(["routed", "resolved"]);
  });

  it("routed can transition to resolved", () => {
    expect(VALID_ITEM_TRANSITIONS.routed).toEqual(["resolved"]);
  });

  it("resolved has no transitions", () => {
    expect(VALID_ITEM_TRANSITIONS.resolved).toEqual([]);
  });
});

describe("getRoutingGuidance", () => {
  it("returns tier 1 guidance", () => {
    const guidance = getRoutingGuidance("1", null);
    expect(guidance).toBe("Tag and move on. Bulk lot, donate, or dispose.");
  });

  it("returns tier 2 guidance with valuation", () => {
    const guidance = getRoutingGuidance("2", { lowEstimate: 50, highEstimate: 150 });
    expect(guidance).toBe("Price tag it. AI suggests: $50 – $150");
  });

  it("returns tier 2 guidance without valuation", () => {
    const guidance = getRoutingGuidance("2", null);
    expect(guidance).toBe("Price tag it.");
  });

  it("returns tier 3 guidance", () => {
    const guidance = getRoutingGuidance("3", null);
    expect(guidance).toBe("Pull for research. Take full photo set.");
  });

  it("returns tier 4 guidance", () => {
    const guidance = getRoutingGuidance("4", null);
    expect(guidance).toBe("Secure this item. Potential high value.");
  });
});

describe("isValidDisposition", () => {
  it("returns true for valid dispositions", () => {
    expect(isValidDisposition("sold_onsite")).toBe(true);
    expect(isValidDisposition("bulk_lot")).toBe(true);
    expect(isValidDisposition("donated")).toBe(true);
    expect(isValidDisposition("trashed")).toBe(true);
  });

  it("returns false for invalid dispositions", () => {
    expect(isValidDisposition("sell")).toBe(false);
    expect(isValidDisposition("keep")).toBe(false);
    expect(isValidDisposition("")).toBe(false);
  });
});

describe("isValidItemTransition", () => {
  it("allows pending → triaged", () => {
    expect(isValidItemTransition("pending", "triaged")).toBe(true);
  });

  it("allows triaged → routed", () => {
    expect(isValidItemTransition("triaged", "routed")).toBe(true);
  });

  it("allows triaged → resolved", () => {
    expect(isValidItemTransition("triaged", "resolved")).toBe(true);
  });

  it("allows routed → resolved", () => {
    expect(isValidItemTransition("routed", "resolved")).toBe(true);
  });

  it("rejects pending → resolved", () => {
    expect(isValidItemTransition("pending", "resolved")).toBe(false);
  });

  it("rejects resolved → anything", () => {
    expect(isValidItemTransition("resolved", "pending")).toBe(false);
    expect(isValidItemTransition("resolved", "triaged")).toBe(false);
  });

  it("rejects backwards transitions", () => {
    expect(isValidItemTransition("triaged", "pending")).toBe(false);
    expect(isValidItemTransition("routed", "triaged")).toBe(false);
  });
});

describe("resolveStatusOnDisposition", () => {
  it("returns resolved for triaged items", () => {
    expect(resolveStatusOnDisposition("triaged")).toBe("resolved");
  });

  it("returns resolved for routed items", () => {
    expect(resolveStatusOnDisposition("routed")).toBe("resolved");
  });

  it("returns null for pending items (cannot resolve)", () => {
    expect(resolveStatusOnDisposition("pending")).toBeNull();
  });

  it("returns null for already resolved items", () => {
    expect(resolveStatusOnDisposition("resolved")).toBeNull();
  });
});
