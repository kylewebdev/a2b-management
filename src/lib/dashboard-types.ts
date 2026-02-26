export interface DashboardStats {
  activeEstates: number;
  itemsPendingTriage: number;
  itemsPendingDisposition: number;
  totalEstimatedValueLow: number;
  totalEstimatedValueHigh: number;
}

export interface AttentionEstate {
  id: string;
  name: string | null;
  address: string;
  reason: "awaiting_disposition" | "stale" | "low_confidence";
  reasonDetail: string;
  itemCount: number;
}

export interface RankedEstate {
  id: string;
  name: string | null;
  address: string;
  status: "active" | "resolving" | "closed";
  itemCount: number;
  pendingCount: number;
  estimatedValueLow: number;
  estimatedValueHigh: number;
  lastActivity: string;
}
