export interface TriageRequest {
  photos: { base64: string; mimeType: string }[];
  estateContext?: {
    address: string;
    name?: string | null;
  };
}

export interface TriageResult {
  identification: {
    title: string;
    description: string;
    category: string;
    period?: string | null;
    maker?: string | null;
    materials?: string[] | null;
  };
  tier: "1" | "2" | "3" | "4";
  confidence: "low" | "medium" | "high";
  valuation: {
    lowEstimate: number;
    highEstimate: number;
    currency: string;
    comparables?: string[] | null;
  };
  condition?: string | null;
  additionalPhotosRequested?: string[] | null;
  listingGuidance?: {
    platforms?: string[] | null;
    keywords?: string[] | null;
    description?: string | null;
  } | null;
  sleeperAlert?: string | null;
}

export interface TriageUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface AIProvider {
  name: string;
  model: string;
  triage(request: TriageRequest): AsyncIterable<string>;
  getUsage(): TriageUsage | null;
}
