import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildUserMessage } from "../prompt";

describe("buildSystemPrompt", () => {
  it("includes all required sections", () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain("Tier Classification");
    expect(prompt).toContain("Tier 1");
    expect(prompt).toContain("Tier 2");
    expect(prompt).toContain("Tier 3");
    expect(prompt).toContain("Tier 4");
    expect(prompt).toContain("identification");
    expect(prompt).toContain("valuation");
    expect(prompt).toContain("confidence");
    expect(prompt).toContain("Sleeper");
    expect(prompt).toContain("listingGuidance");
    expect(prompt).toContain("Response Format");
  });

  it("interpolates estate context with name and address", () => {
    const prompt = buildSystemPrompt({ address: "123 Main St", name: "Smith Estate" });

    expect(prompt).toContain("Smith Estate — 123 Main St");
  });

  it("interpolates estate context with address only", () => {
    const prompt = buildSystemPrompt({ address: "456 Oak Ave", name: null });

    expect(prompt).toContain("456 Oak Ave");
    // Estate line should not include "null" as the name
    expect(prompt).not.toContain("null — 456 Oak Ave");
  });

  it("works without estate context", () => {
    const prompt = buildSystemPrompt();

    expect(prompt).not.toContain("Estate:");
    expect(prompt).toContain("expert estate liquidation appraiser");
  });

  it("instructs JSON-only output", () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain("Return ONLY valid JSON");
    expect(prompt).toContain("no markdown");
  });
});

describe("buildUserMessage", () => {
  it("returns singular message for 1 photo", () => {
    const msg = buildUserMessage(1);

    expect(msg).toContain("this item photo");
    expect(msg).not.toContain("these");
  });

  it("returns plural message for multiple photos", () => {
    const msg = buildUserMessage(3);

    expect(msg).toContain("these 3 photos");
    expect(msg).toContain("same item");
  });
});
