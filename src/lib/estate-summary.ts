interface SummaryItem {
  tier: string | null;
  status: string;
  aiValuation: { lowEstimate?: number; highEstimate?: number } | null;
}

export interface EstateSummary {
  tierBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  totalEstimatedValueLow: number;
  totalEstimatedValueHigh: number;
  unresolvedCount: number;
  totalCount: number;
}

export function computeEstateSummary(items: SummaryItem[]): EstateSummary {
  const tierBreakdown: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, untiered: 0 };
  const statusBreakdown: Record<string, number> = { pending: 0, triaged: 0, routed: 0, resolved: 0 };
  let totalEstimatedValueLow = 0;
  let totalEstimatedValueHigh = 0;
  let unresolvedCount = 0;

  for (const item of items) {
    // Tier
    if (item.tier && item.tier in tierBreakdown) {
      tierBreakdown[item.tier]++;
    } else {
      tierBreakdown.untiered++;
    }

    // Status
    if (item.status in statusBreakdown) {
      statusBreakdown[item.status]++;
    }

    // Value
    if (item.aiValuation) {
      totalEstimatedValueLow += item.aiValuation.lowEstimate ?? 0;
      totalEstimatedValueHigh += item.aiValuation.highEstimate ?? 0;
    }

    // Unresolved
    if (item.status !== "resolved") {
      unresolvedCount++;
    }
  }

  return {
    tierBreakdown,
    statusBreakdown,
    totalEstimatedValueLow,
    totalEstimatedValueHigh,
    unresolvedCount,
    totalCount: items.length,
  };
}
