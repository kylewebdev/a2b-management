"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

interface ProviderUsage {
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  triageCount: number;
  cost: number;
}

interface EstateUsage {
  estateId: string;
  estateAddress: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  triageCount: number;
  cost: number;
}

interface UsageData {
  lifetime: {
    totalTokens: number;
    totalCost: number;
    triageCount: number;
    byProvider: ProviderUsage[];
  };
  today: {
    totalTokens: number;
    totalCost: number;
    triageCount: number;
  };
  byEstate: EstateUsage[];
}

function fmt(n: number): string {
  return n.toLocaleString();
}

function fmtCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function UsageDashboard({ costWarningThreshold }: { costWarningThreshold?: number | null }) {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/usage");
        if (!res.ok) throw new Error("Failed to load");
        setData(await res.json());
      } catch {
        setError("Failed to load usage data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-secondary" data-testid="usage-loading">
        <Loader2 size={16} className="animate-spin" />
        Loading usage data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-400">
        <AlertTriangle size={16} />
        {error}
      </div>
    );
  }

  if (!data || data.lifetime.triageCount === 0) {
    return (
      <p className="text-sm text-text-muted">No triage activity yet.</p>
    );
  }

  const showWarning =
    costWarningThreshold != null &&
    costWarningThreshold > 0 &&
    data.lifetime.totalCost > costWarningThreshold;

  return (
    <div className="space-y-6">
      {/* Cost Warning */}
      {showWarning && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-600 bg-yellow-950/30 p-3 text-xs text-yellow-400">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            Your estimated spending has exceeded your {fmtCost(costWarningThreshold!)} threshold.
            Lifetime cost: {fmtCost(data.lifetime.totalCost)}.
          </span>
        </div>
      )}

      {/* Lifetime Totals */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-md border border-border bg-surface p-3">
          <p className="text-xs text-text-muted">Lifetime Tokens</p>
          <p className="mt-1 text-lg font-semibold text-text-primary">{fmt(data.lifetime.totalTokens)}</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-3">
          <p className="text-xs text-text-muted">Est. Cost</p>
          <p className="mt-1 text-lg font-semibold text-text-primary">{fmtCost(data.lifetime.totalCost)}</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-3">
          <p className="text-xs text-text-muted">Triages</p>
          <p className="mt-1 text-lg font-semibold text-text-primary">{fmt(data.lifetime.triageCount)}</p>
        </div>
      </div>

      {/* Today */}
      <div>
        <h3 className="text-xs font-medium text-text-muted">Today</h3>
        <div className="mt-2 grid grid-cols-3 gap-4">
          <div className="rounded-md border border-border bg-surface p-3">
            <p className="text-xs text-text-muted">Tokens</p>
            <p className="mt-1 text-sm font-semibold text-text-primary">{fmt(data.today.totalTokens)}</p>
          </div>
          <div className="rounded-md border border-border bg-surface p-3">
            <p className="text-xs text-text-muted">Est. Cost</p>
            <p className="mt-1 text-sm font-semibold text-text-primary">{fmtCost(data.today.totalCost)}</p>
          </div>
          <div className="rounded-md border border-border bg-surface p-3">
            <p className="text-xs text-text-muted">Triages</p>
            <p className="mt-1 text-sm font-semibold text-text-primary">{fmt(data.today.triageCount)}</p>
          </div>
        </div>
      </div>

      {/* Per-Estate Breakdown */}
      {data.byEstate.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-text-muted">Per-Estate Breakdown</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-text-muted">
                  <th className="pb-2 pr-4 font-medium">Estate</th>
                  <th className="pb-2 pr-4 font-medium text-right">Triages</th>
                  <th className="pb-2 pr-4 font-medium text-right">Tokens</th>
                  <th className="pb-2 font-medium text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.byEstate.map((row) => (
                  <tr key={`${row.estateId}-${row.provider}`} className="border-b border-border/50">
                    <td className="py-2 pr-4 text-text-primary">{row.estateAddress}</td>
                    <td className="py-2 pr-4 text-right text-text-secondary">{row.triageCount}</td>
                    <td className="py-2 pr-4 text-right text-text-secondary">{fmt(row.totalTokens)}</td>
                    <td className="py-2 text-right text-text-secondary">{fmtCost(row.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
