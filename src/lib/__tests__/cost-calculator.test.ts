import { describe, it, expect } from "vitest";
import {
  calculateCost,
  estimateCostFromTotal,
  getDisplayRate,
  PRICING,
} from "../cost-calculator";

describe("cost-calculator", () => {
  describe("calculateCost", () => {
    it("calculates Anthropic Sonnet cost correctly", () => {
      // 1000 input tokens at $3/1M + 500 output tokens at $15/1M
      const cost = calculateCost("anthropic", "claude-sonnet-4-20250514", 1000, 500);
      // (1000 * 3 / 1_000_000) + (500 * 15 / 1_000_000) = 0.003 + 0.0075 = 0.0105 → $0.01
      expect(cost).toBe(0.01);
    });

    it("calculates Anthropic Opus cost correctly", () => {
      const cost = calculateCost("anthropic", "claude-opus-4-20250514", 10000, 2000);
      // (10000 * 15 / 1M) + (2000 * 75 / 1M) = 0.15 + 0.15 = 0.30
      expect(cost).toBe(0.3);
    });

    it("calculates Anthropic Haiku cost correctly", () => {
      const cost = calculateCost("anthropic", "claude-haiku-4-5-20251001", 100000, 10000);
      // (100000 * 0.80 / 1M) + (10000 * 4 / 1M) = 0.08 + 0.04 = 0.12
      expect(cost).toBe(0.12);
    });

    it("calculates OpenAI GPT-4o cost correctly", () => {
      const cost = calculateCost("openai", "gpt-4o", 5000, 1000);
      // (5000 * 2.50 / 1M) + (1000 * 10 / 1M) = 0.0125 + 0.01 = 0.0225 → $0.02
      expect(cost).toBe(0.02);
    });

    it("calculates OpenAI GPT-4o-mini cost correctly", () => {
      const cost = calculateCost("openai", "gpt-4o-mini", 100000, 50000);
      // (100000 * 0.15 / 1M) + (50000 * 0.60 / 1M) = 0.015 + 0.03 = 0.045 → $0.05
      expect(cost).toBe(0.05);
    });

    it("calculates OpenAI GPT-4.1 cost correctly", () => {
      const cost = calculateCost("openai", "gpt-4.1", 10000, 5000);
      // (10000 * 2 / 1M) + (5000 * 8 / 1M) = 0.02 + 0.04 = 0.06
      expect(cost).toBe(0.06);
    });

    it("calculates Google Gemini Flash cost correctly", () => {
      const cost = calculateCost("google", "gemini-2.0-flash", 100000, 20000);
      // (100000 * 0.10 / 1M) + (20000 * 0.40 / 1M) = 0.01 + 0.008 = 0.018 → $0.02
      expect(cost).toBe(0.02);
    });

    it("calculates Google Gemini Pro cost correctly", () => {
      const cost = calculateCost("google", "gemini-2.5-pro", 10000, 5000);
      // (10000 * 1.25 / 1M) + (5000 * 10 / 1M) = 0.0125 + 0.05 = 0.0625 → $0.06
      expect(cost).toBe(0.06);
    });

    it("calculates Google Gemini Flash Lite cost correctly", () => {
      const cost = calculateCost("google", "gemini-2.0-flash-lite", 1000000, 100000);
      // (1000000 * 0.075 / 1M) + (100000 * 0.30 / 1M) = 0.075 + 0.03 = 0.105 → $0.11
      expect(cost).toBe(0.11);
    });

    it("returns 0.00 for zero tokens", () => {
      expect(calculateCost("anthropic", "claude-sonnet-4-20250514", 0, 0)).toBe(0);
    });

    it("rounds to 2 decimal places", () => {
      // Use values that produce a non-round number
      const cost = calculateCost("anthropic", "claude-sonnet-4-20250514", 333, 777);
      // (333 * 3 / 1M) + (777 * 15 / 1M) = 0.000999 + 0.011655 = 0.012654 → $0.01
      expect(cost).toBe(0.01);
    });

    it("falls back to provider default pricing for unknown model", () => {
      // Unknown model for anthropic should use the first entry (sonnet)
      const knownCost = calculateCost("anthropic", "claude-sonnet-4-20250514", 10000, 5000);
      const unknownCost = calculateCost("anthropic", "some-future-model", 10000, 5000);
      expect(unknownCost).toBe(knownCost);
    });

    it("falls back to anthropic default for completely unknown provider", () => {
      const cost = calculateCost("unknown-provider", "unknown-model", 10000, 5000);
      // Should use anthropic/claude-sonnet default
      const expected = calculateCost("anthropic", "claude-sonnet-4-20250514", 10000, 5000);
      expect(cost).toBe(expected);
    });
  });

  describe("estimateCostFromTotal", () => {
    it("estimates cost using 80/20 input/output ratio", () => {
      // 10000 total → 8000 input, 2000 output
      const estimated = estimateCostFromTotal("anthropic", "claude-sonnet-4-20250514", 10000);
      const direct = calculateCost("anthropic", "claude-sonnet-4-20250514", 8000, 2000);
      expect(estimated).toBe(direct);
    });

    it("returns 0 for zero total tokens", () => {
      expect(estimateCostFromTotal("openai", "gpt-4o", 0)).toBe(0);
    });
  });

  describe("getDisplayRate", () => {
    it("returns per-1M rates for a known model", () => {
      const rate = getDisplayRate("anthropic", "claude-sonnet-4-20250514");
      expect(rate).toEqual({ inputPer1M: 3, outputPer1M: 15 });
    });

    it("returns per-1M rates for OpenAI", () => {
      const rate = getDisplayRate("openai", "gpt-4o");
      expect(rate).toEqual({ inputPer1M: 2.5, outputPer1M: 10 });
    });

    it("returns default rates for unknown model", () => {
      const rate = getDisplayRate("google", "some-unknown-model");
      // Should fall back to first google model (gemini-2.0-flash)
      expect(rate).toEqual({ inputPer1M: 0.1, outputPer1M: 0.4 });
    });
  });

  describe("PRICING", () => {
    it("contains entries for all supported providers", () => {
      const keys = Object.keys(PRICING);
      expect(keys.some((k) => k.startsWith("anthropic/"))).toBe(true);
      expect(keys.some((k) => k.startsWith("openai/"))).toBe(true);
      expect(keys.some((k) => k.startsWith("google/"))).toBe(true);
    });
  });
});
