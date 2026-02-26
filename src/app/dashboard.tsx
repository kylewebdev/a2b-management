"use client";

import Link from "next/link";
import {
  Plus,
  Warehouse,
  Home,
  Clock,
  FileCheck,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { AttentionCard } from "@/components/attention-card";
import { DashboardEstateCard } from "@/components/dashboard-estate-card";
import { formatValueRange } from "@/lib/format";
import type { DashboardStats, AttentionEstate, RankedEstate } from "@/lib/dashboard-types";

interface DashboardProps {
  stats: DashboardStats;
  attentionEstates: AttentionEstate[];
  rankedEstates: RankedEstate[];
}

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-text-muted">
        <Icon size={14} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold text-text-primary">{value}</p>
    </div>
  );
}

export function Dashboard({
  stats,
  attentionEstates,
  rankedEstates,
}: DashboardProps) {
  const isEmpty = stats.activeEstates === 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <Link
          href="/estates/new"
          className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg transition-colors hover:bg-accent/90"
        >
          <Plus size={16} />
          New Estate
        </Link>
      </div>

      {isEmpty ? (
        <div className="mt-6 flex flex-col items-center rounded-lg border border-dashed border-border py-10 text-center">
          <Warehouse size={24} className="text-text-muted" />
          <p className="mt-2 text-sm text-text-secondary">
            No active estates. Time to start digging.
          </p>
          <Link
            href="/estates/new"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent/90"
          >
            <Plus size={16} />
            New Estate
          </Link>
        </div>
      ) : (
        <>
          {/* Stat Tiles */}
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Active Estates"
              value={stats.activeEstates}
              icon={Home}
            />
            <StatTile
              label="Pending Triage"
              value={stats.itemsPendingTriage}
              icon={Clock}
            />
            <StatTile
              label="Pending Disposition"
              value={stats.itemsPendingDisposition}
              icon={FileCheck}
            />
            <StatTile
              label="Estimated Value"
              value={formatValueRange(
                stats.totalEstimatedValueLow,
                stats.totalEstimatedValueHigh,
              )}
              icon={DollarSign}
            />
          </div>

          {/* Needs Attention */}
          {attentionEstates.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-tier-2" />
                <h2 className="text-sm font-semibold text-text-secondary">
                  Needs Attention
                </h2>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {attentionEstates.map((estate) => (
                  <AttentionCard key={estate.id} {...estate} />
                ))}
              </div>
            </div>
          )}

          {/* Recent & Active Estates */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-secondary">
                Recent Estates
              </h2>
              <Link
                href="/estates"
                className="text-xs font-medium text-accent hover:text-accent/80"
              >
                View all
              </Link>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {rankedEstates.map((estate) => (
                <DashboardEstateCard key={estate.id} {...estate} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
