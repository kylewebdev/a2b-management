"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";
import { useTriageStream } from "@/lib/hooks/use-triage-stream";
import { TierBadge } from "@/components/tier-badge";

/** Build an eBay sold-items search URL from a comparable description */
function ebaySearchUrl(comp: string): string {
  // Strip price/source suffix — take text before the first " — $" or " - $"
  const searchTerm = comp.replace(/\s*[—–-]\s*\$.*$/, "").trim();
  const query = encodeURIComponent(searchTerm);
  // LH_Complete=1&LH_Sold=1 filters to sold listings
  return `https://www.ebay.com/sch/i.html?_nkw=${query}&LH_Complete=1&LH_Sold=1`;
}

interface TriageDisplayProps {
  itemId: string;
  itemStatus: string;
  existingResult?: {
    tier?: string | null;
    aiIdentification?: { title?: string; description?: string; category?: string } | null;
    aiValuation?: {
      lowEstimate?: number;
      highEstimate?: number;
      confidence?: string;
      condition?: string;
      comparables?: string[];
      listingGuidance?: { platforms?: string[]; keywords?: string[]; description?: string } | null;
      sleeperAlert?: string | null;
      additionalPhotosRequested?: string[] | null;
    } | null;
  };
}

export function TriageDisplay({ itemId, itemStatus, existingResult }: TriageDisplayProps) {
  const router = useRouter();
  const { state, streamText, result, error, startTriage } = useTriageStream(itemId);

  // Use streamed result if available, otherwise existing
  const displayResult = result ?? undefined;
  const displayIdentification = displayResult?.identification ?? existingResult?.aiIdentification;
  // Merge AI result valuation with extended fields (condition, listingGuidance, etc.)
  const displayValuation = displayResult
    ? {
        lowEstimate: displayResult.valuation.lowEstimate,
        highEstimate: displayResult.valuation.highEstimate,
        comparables: displayResult.valuation.comparables ?? undefined,
        confidence: displayResult.confidence,
        condition: displayResult.condition ?? undefined,
        listingGuidance: displayResult.listingGuidance ?? undefined,
        sleeperAlert: displayResult.sleeperAlert ?? undefined,
        additionalPhotosRequested: displayResult.additionalPhotosRequested ?? undefined,
      }
    : existingResult?.aiValuation ?? null;
  const displayTier = displayResult?.tier ?? existingResult?.tier;
  const displayConfidence = displayResult?.confidence ?? (existingResult?.aiValuation?.confidence as string | undefined);

  const hasResult = itemStatus === "triaged" || state === "complete";

  function handleTriage() {
    startTriage();
  }

  function handleRetry() {
    startTriage();
  }

  // Refresh server data once when triage completes
  const didRefresh = useRef(false);
  useEffect(() => {
    if (state === "complete" && !didRefresh.current) {
      didRefresh.current = true;
      router.refresh();
    }
    if (state !== "complete") {
      didRefresh.current = false;
    }
  }, [state, router]);

  // Idle / Pending — show triage button
  if (state === "idle" && itemStatus === "pending") {
    return (
      <div className="mt-4">
        <button
          onClick={handleTriage}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent/90"
          data-testid="triage-button"
        >
          <Sparkles size={16} />
          Triage
        </button>
      </div>
    );
  }

  // Starting
  if (state === "starting") {
    return (
      <div className="mt-4 flex items-center gap-2 text-sm text-text-secondary" data-testid="triage-starting">
        <Loader2 size={16} className="animate-spin" />
        Preparing triage...
      </div>
    );
  }

  // Streaming
  if (state === "streaming") {
    return (
      <div className="mt-4" data-testid="triage-streaming">
        <div className="flex items-center gap-2 text-sm text-accent">
          <Loader2 size={14} className="animate-spin" />
          Analyzing...
        </div>
        <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-border bg-bg p-3 font-mono text-xs text-text-secondary">
          {streamText || "Waiting for response..."}
          <span className="inline-block h-3 w-1 animate-pulse bg-accent" />
        </div>
      </div>
    );
  }

  // Error
  if (state === "error") {
    return (
      <div className="mt-4" data-testid="triage-error">
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertTriangle size={14} />
          {error || "Triage failed"}
        </div>
        <button
          onClick={handleRetry}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-raised"
          data-testid="retry-button"
        >
          <RefreshCw size={14} />
          Try Again
        </button>
      </div>
    );
  }

  // Complete or already triaged — this is the fallback for idle+triaged items
  if (hasResult) {
    return (
      <div className="mt-4 space-y-3" data-testid="triage-result">
        {/* 1. Hero card — Tier + Value */}
        <div className="flex items-center justify-between rounded-lg bg-surface p-4" data-testid="hero-card">
          <TierBadge tier={(displayTier as "1" | "2" | "3" | "4") ?? null} />
          {displayValuation && (displayValuation.lowEstimate != null || displayValuation.highEstimate != null) && (
            <div className="text-right">
              <p className="text-xl font-bold text-text-primary">
                ${displayValuation.lowEstimate?.toLocaleString()} – ${displayValuation.highEstimate?.toLocaleString()}
              </p>
              {displayConfidence && (
                <p className="text-xs text-text-muted">
                  {displayConfidence} confidence
                </p>
              )}
            </div>
          )}
        </div>

        {/* 2. Sleeper Alert */}
        {displayValuation?.sleeperAlert && (
          <div className="rounded-md border border-amber-400/30 bg-amber-400/5 p-3" data-testid="sleeper-alert">
            <div className="flex items-center gap-1.5 text-sm font-medium text-amber-400">
              <AlertTriangle size={14} />
              Sleeper Alert
            </div>
            <p className="mt-1 text-xs text-text-secondary">{displayValuation.sleeperAlert}</p>
          </div>
        )}

        {/* 3. Comparable Sales */}
        {displayValuation?.comparables && displayValuation.comparables.length > 0 && (
          <div className="overflow-hidden rounded-lg bg-surface" data-testid="comparables">
            <h3 className="px-4 pt-3 pb-2 text-xs font-medium text-text-muted">Comparable Sales</h3>
            <div className="divide-y divide-border">
              {displayValuation.comparables.map((comp: string, i: number) => (
                <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-sm text-text-secondary">{comp}</span>
                  <a
                    href={ebaySearchUrl(comp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-shrink-0 items-center gap-1 rounded-md border border-accent/30 px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/10"
                  >
                    eBay
                    <ExternalLink size={10} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Listing Guidance (Tier 3+ only) */}
        {displayValuation?.listingGuidance && (
          <div className="rounded-lg bg-surface p-4" data-testid="listing-guidance">
            <h3 className="text-xs font-medium text-text-muted">Listing Guidance</h3>
            <div className="mt-2 space-y-2">
              {displayValuation.listingGuidance.platforms && (
                <div className="flex flex-wrap gap-1.5">
                  {displayValuation.listingGuidance.platforms.map((platform: string, i: number) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent"
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              )}
              {displayValuation.listingGuidance.keywords && (
                <div className="flex flex-wrap gap-1.5">
                  {displayValuation.listingGuidance.keywords.map((keyword: string, i: number) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-full bg-surface-raised px-2 py-0.5 text-xs text-text-secondary"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              )}
              {displayValuation.listingGuidance.description && (
                <p className="text-sm text-text-secondary">
                  {displayValuation.listingGuidance.description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 5. Additional Photos Needed */}
        {displayValuation?.additionalPhotosRequested && displayValuation.additionalPhotosRequested.length > 0 && (
          <div className="rounded-md border border-amber-400/30 bg-amber-400/5 p-3" data-testid="additional-photos">
            <h3 className="text-xs font-medium text-amber-400">Additional Photos Needed</h3>
            <ul className="mt-1 space-y-1">
              {displayValuation.additionalPhotosRequested.map((req: string, i: number) => (
                <li key={i} className="text-xs text-text-secondary">
                  {req}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 6. AI Details — de-emphasized reference section */}
        {(displayIdentification || displayValuation?.condition) && (
          <div className="rounded-lg bg-surface/50 p-4" data-testid="ai-details">
            <h3 className="text-xs font-medium text-text-muted">AI Analysis</h3>
            <div className="mt-2 space-y-1.5">
              {displayIdentification?.title && (
                <p className="text-sm text-text-muted">{displayIdentification.title}</p>
              )}
              {displayIdentification?.description && (
                <p className="text-xs text-text-muted">{displayIdentification.description}</p>
              )}
              {displayValuation?.condition && (
                <p className="text-xs text-text-muted">
                  <span className="font-medium">Condition:</span> {displayValuation.condition}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 7. Re-triage button */}
        <button
          onClick={handleTriage}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-raised"
          data-testid="retriage-button"
        >
          <RefreshCw size={14} />
          Re-triage
        </button>
      </div>
    );
  }

  return null;
}
