interface LifecycleItem {
  status: string;
  aiValuation: { lowEstimate?: number; highEstimate?: number } | null;
}

export function canCloseEstate(items: LifecycleItem[]): boolean {
  if (items.length === 0) return false;
  return items.every((item) => item.status === "resolved");
}

export interface CloseEstateStats {
  totalItems: number;
  resolvedCount: number;
  totalEstimatedValueLow: number;
  totalEstimatedValueHigh: number;
}

export function getCloseEstateStats(items: LifecycleItem[]): CloseEstateStats {
  let resolvedCount = 0;
  let totalEstimatedValueLow = 0;
  let totalEstimatedValueHigh = 0;

  for (const item of items) {
    if (item.status === "resolved") resolvedCount++;
    if (item.aiValuation) {
      totalEstimatedValueLow += item.aiValuation.lowEstimate ?? 0;
      totalEstimatedValueHigh += item.aiValuation.highEstimate ?? 0;
    }
  }

  return {
    totalItems: items.length,
    resolvedCount,
    totalEstimatedValueLow,
    totalEstimatedValueHigh,
  };
}
