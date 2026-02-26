"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

interface BatchTriageProps {
  estateId: string;
  pendingItemIds: string[];
}

type BatchState = "idle" | "running" | "complete";

interface BatchResult {
  total: number;
  succeeded: number;
  failed: number;
}

export function BatchTriage({ estateId, pendingItemIds }: BatchTriageProps) {
  const router = useRouter();
  const [state, setState] = useState<BatchState>("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);

  const runBatch = useCallback(async () => {
    setState("running");
    setCurrentIndex(0);
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < pendingItemIds.length; i++) {
      setCurrentIndex(i + 1);

      try {
        // POST to validate
        const postRes = await fetch(`/api/items/${pendingItemIds[i]}/triage`, {
          method: "POST",
        });
        if (!postRes.ok) {
          failed++;
          continue;
        }

        // GET SSE stream and consume it
        const sseRes = await fetch(`/api/items/${pendingItemIds[i]}/triage/stream`);
        if (!sseRes.ok || !sseRes.body) {
          failed++;
          continue;
        }

        // Consume the stream to completion
        const reader = sseRes.body.getReader();
        let hadError = false;
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          if (text.includes("event: error")) {
            hadError = true;
          }
        }

        if (hadError) {
          failed++;
        } else {
          succeeded++;
        }
      } catch {
        failed++;
      }
    }

    setBatchResult({ total: pendingItemIds.length, succeeded, failed });
    setState("complete");
    router.refresh();
  }, [pendingItemIds, router]);

  if (pendingItemIds.length === 0) return null;

  if (state === "idle") {
    return (
      <button
        onClick={runBatch}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-accent px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
        data-testid="batch-triage-button"
      >
        <Sparkles size={14} />
        Triage All ({pendingItemIds.length})
      </button>
    );
  }

  if (state === "running") {
    return (
      <div className="flex items-center gap-2 text-sm text-text-secondary" data-testid="batch-triage-progress">
        <Loader2 size={14} className="animate-spin text-accent" />
        Triaging item {currentIndex} of {pendingItemIds.length}...
      </div>
    );
  }

  if (state === "complete" && batchResult) {
    return (
      <div className="flex items-center gap-2 text-sm" data-testid="batch-triage-complete">
        {batchResult.failed === 0 ? (
          <>
            <CheckCircle size={14} className="text-accent" />
            <span className="text-text-secondary">
              All {batchResult.succeeded} items triaged
            </span>
          </>
        ) : (
          <>
            <AlertTriangle size={14} className="text-amber-400" />
            <span className="text-text-secondary">
              {batchResult.succeeded} triaged, {batchResult.failed} failed
            </span>
          </>
        )}
      </div>
    );
  }

  return null;
}
