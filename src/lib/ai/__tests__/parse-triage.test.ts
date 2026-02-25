import { describe, it, expect } from "vitest";
import { parseTriageResult } from "../parse-triage";

const VALID_RESULT = {
  identification: {
    title: "Roseville Pottery Freesia Vase",
    description: "Mid-century Roseville pottery vase in the Freesia pattern, green glaze, approximately 8 inches tall.",
    category: "pottery",
    period: "1940s",
    maker: "Roseville Pottery",
    materials: ["ceramic"],
  },
  tier: "3" as const,
  confidence: "high" as const,
  valuation: {
    lowEstimate: 120,
    highEstimate: 180,
    currency: "USD",
    comparables: [
      "eBay sold: Roseville Freesia vase 8in green - $145, Jan 2024",
      "eBay sold: Roseville Freesia vase green - $165, Dec 2023",
    ],
  },
  condition: "Good - minor wear to base, no chips or cracks visible",
  additionalPhotosRequested: null,
  listingGuidance: {
    platforms: ["eBay"],
    keywords: ["Roseville", "Freesia", "vase", "art pottery", "mid-century"],
    description: "Vintage Roseville Pottery Freesia pattern vase in green glaze.",
  },
  sleeperAlert: null,
};

describe("parseTriageResult", () => {
  it("parses well-formed JSON into TriageResult", () => {
    const { result, partial, raw } = parseTriageResult(JSON.stringify(VALID_RESULT));

    expect(result).not.toBeNull();
    expect(result!.identification.title).toBe("Roseville Pottery Freesia Vase");
    expect(result!.tier).toBe("3");
    expect(result!.confidence).toBe("high");
    expect(partial).toBeNull();
    expect(raw).toBe(JSON.stringify(VALID_RESULT));
  });

  it("strips markdown code fences before parsing", () => {
    const fenced = "```json\n" + JSON.stringify(VALID_RESULT) + "\n```";
    const { result } = parseTriageResult(fenced);

    expect(result).not.toBeNull();
    expect(result!.tier).toBe("3");
  });

  it("strips plain code fences (no json tag)", () => {
    const fenced = "```\n" + JSON.stringify(VALID_RESULT) + "\n```";
    const { result } = parseTriageResult(fenced);

    expect(result).not.toBeNull();
    expect(result!.identification.title).toBe("Roseville Pottery Freesia Vase");
  });

  it("extracts tier and values for each tier classification", () => {
    for (const tier of ["1", "2", "3", "4"] as const) {
      const input = { ...VALID_RESULT, tier };
      const { result } = parseTriageResult(JSON.stringify(input));
      expect(result).not.toBeNull();
      expect(result!.tier).toBe(tier);
    }
  });

  it("handles missing optional fields", () => {
    const minimal = {
      identification: { title: "Old lamp", description: "A lamp", category: "lighting" },
      tier: "1",
      confidence: "high",
      valuation: { lowEstimate: 5, highEstimate: 15, currency: "USD" },
    };
    const { result } = parseTriageResult(JSON.stringify(minimal));

    expect(result).not.toBeNull();
    expect(result!.tier).toBe("1");
    expect(result!.listingGuidance).toBeUndefined();
    expect(result!.sleeperAlert).toBeUndefined();
  });

  it("returns partial result for valid JSON that fails Zod validation", () => {
    const invalid = { ...VALID_RESULT, tier: "5" }; // invalid tier
    const { result, partial } = parseTriageResult(JSON.stringify(invalid));

    expect(result).toBeNull();
    expect(partial).not.toBeNull();
    expect(partial!.identification).toBeDefined();
  });

  it("extracts tier from malformed text via regex", () => {
    const text = "This looks like a Tier 2 item. Worth about $20-$40.";
    const { result, partial } = parseTriageResult(text);

    expect(result).toBeNull();
    expect(partial).not.toBeNull();
    expect(partial!.tier).toBe("2");
    expect(partial!.valuation!.lowEstimate).toBe(20);
    expect(partial!.valuation!.highEstimate).toBe(40);
  });

  it("extracts price range with en-dash from malformed text", () => {
    const text = "Tier: 3. Estimated value $120–$180.";
    const { partial } = parseTriageResult(text);

    expect(partial).not.toBeNull();
    expect(partial!.tier).toBe("3");
    expect(partial!.valuation!.lowEstimate).toBe(120);
    expect(partial!.valuation!.highEstimate).toBe(180);
  });

  it("returns null result and partial for completely unparseable text", () => {
    const { result, partial, raw } = parseTriageResult("I cannot analyze this image.");

    expect(result).toBeNull();
    expect(partial).toBeNull();
    expect(raw).toBe("I cannot analyze this image.");
  });
});
