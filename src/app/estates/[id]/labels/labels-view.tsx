"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Tag } from "lucide-react";
import { ItemLabel } from "@/components/item-label";

interface LabelItem {
  id: string;
  estateId: string;
  tier: "1" | "2" | "3" | "4" | null;
  status: "triaged" | "routed";
  salePrice: number | null;
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-accent/15 text-accent"
          : "bg-surface text-text-muted hover:bg-surface-raised hover:text-text-secondary"
      }`}
    >
      {children}
    </button>
  );
}

const TIERS = ["1", "2", "3", "4"] as const;

export function LabelsView({
  estateId,
  estateName,
  items,
}: {
  estateId: string;
  estateName: string;
  items: LabelItem[];
}) {
  const [tierFilter, setTierFilter] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const filteredItems = items.filter((item) => {
    if (tierFilter && item.tier !== tierFilter) return false;
    return true;
  });

  return (
    <div>
      {/* Header (hidden in print) */}
      <div className="print:hidden">
        <Link
          href={`/estates/${estateId}`}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={14} />
          Back to estate
        </Link>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Labels</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {filteredItems.length} label{filteredItems.length !== 1 ? "s" : ""} for {estateName}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            disabled={filteredItems.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 min-h-[44px] text-sm font-medium text-bg transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            <Printer size={14} />
            Print Labels
          </button>
        </div>

        {/* Tier filter */}
        {items.length > 0 && (
          <div className="mt-4 flex items-center gap-1" data-testid="tier-filters">
            <FilterButton active={tierFilter === null} onClick={() => setTierFilter(null)}>
              All
            </FilterButton>
            {TIERS.map((tier) => (
              <FilterButton
                key={tier}
                active={tierFilter === tier}
                onClick={() => setTierFilter(tier)}
              >
                T{tier}
              </FilterButton>
            ))}
          </div>
        )}
      </div>

      {/* Labels grid */}
      {filteredItems.length > 0 ? (
        <div
          className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3 print:gap-0 print:mt-0"
          data-testid="labels-grid"
        >
          {filteredItems.map((item) => (
            <ItemLabel
              key={item.id}
              itemId={item.id}
              estateId={item.estateId}
              salePrice={item.salePrice}
              baseUrl={baseUrl}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 flex flex-col items-center rounded-lg border border-dashed border-border py-10 text-center print:hidden">
          <Tag size={24} className="text-text-muted" />
          <p className="mt-2 text-sm text-text-secondary">
            No items ready for labels.
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Items must be triaged before labels can be printed.
          </p>
        </div>
      )}
    </div>
  );
}
