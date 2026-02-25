export const DISPOSITIONS = [
  "sold_onsite",
  "bulk_lot",
  "donated",
  "trashed",
] as const;

export type Disposition = (typeof DISPOSITIONS)[number];

export const DISPOSITION_LABELS: Record<Disposition, string> = {
  sold_onsite: "Sold Onsite",
  bulk_lot: "Bulk Lot",
  donated: "Donated",
  trashed: "Trashed",
};

type ItemStatus = "pending" | "triaged" | "routed" | "resolved";

export const VALID_ITEM_TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
  pending: ["triaged"],
  triaged: ["routed", "resolved"],
  routed: ["resolved"],
  resolved: [],
};

interface Valuation {
  lowEstimate?: number;
  highEstimate?: number;
}

export function getRoutingGuidance(
  tier: string,
  valuation: Valuation | null
): string {
  switch (tier) {
    case "1":
      return "Tag and move on. Bulk lot, donate, or dispose.";
    case "2": {
      if (valuation?.lowEstimate != null && valuation?.highEstimate != null) {
        return `Price tag it. AI suggests: $${valuation.lowEstimate} – $${valuation.highEstimate}`;
      }
      return "Price tag it.";
    }
    case "3":
      return "Pull for research. Take full photo set.";
    case "4":
      return "Secure this item. Potential high value.";
    default:
      return "";
  }
}

export function isValidDisposition(value: string): value is Disposition {
  return (DISPOSITIONS as readonly string[]).includes(value);
}

export function isValidItemTransition(
  from: ItemStatus,
  to: ItemStatus
): boolean {
  return VALID_ITEM_TRANSITIONS[from]?.includes(to) ?? false;
}

export function resolveStatusOnDisposition(
  currentStatus: ItemStatus
): "resolved" | null {
  if (currentStatus === "triaged" || currentStatus === "routed") {
    return "resolved";
  }
  return null;
}
