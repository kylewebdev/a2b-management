"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Pencil, Trash2, Package, Camera, CheckCircle, Tag } from "lucide-react";
import { canCloseEstate, getCloseEstateStats } from "@/lib/estate-lifecycle";
import { useToast } from "@/components/toast";
import { StatusBadge } from "@/components/status-badge";
import { ItemCard } from "@/components/item-card";
import { SwipeableItemCard } from "@/components/swipeable-item-card";
import type { Disposition } from "@/lib/disposition";
import { BatchTriage } from "./batch-triage";
import { EstateSummaryPanel } from "./estate-summary";
import { ItemFilters } from "./item-filters";
import type { EstateSummary } from "@/lib/estate-summary";
import { AddressAutocomplete } from "@/components/address-autocomplete";

interface Estate {
  id: string;
  name: string | null;
  address: string;
  status: "active" | "resolving" | "closed";
  clientName: string | null;
  notes: string | null;
  itemCount: number;
  createdAt: string;
}

interface ItemSummary {
  id: string;
  estateId: string;
  tier: "1" | "2" | "3" | "4" | null;
  status: "pending" | "triaged" | "routed" | "resolved";
  thumbnailUrl: string | null;
  aiIdentification: { title?: string } | null;
  aiValuation: { lowEstimate?: number; highEstimate?: number } | null;
  disposition: string | null;
}

const STATUS_OPTIONS: { value: "active" | "resolving" | "closed"; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "resolving", label: "Resolving" },
  { value: "closed", label: "Closed" },
];

export function EstateDetail({ estate, items = [], pendingItemIds = [], summary, nextCursor }: { estate: Estate; items?: ItemSummary[]; pendingItemIds?: string[]; summary?: EstateSummary; nextCursor?: string | null }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [moreItems, setMoreItems] = useState<ItemSummary[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | null>(nextCursor ?? null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Edit form state
  const [name, setName] = useState(estate.name ?? "");
  const [address, setAddress] = useState(estate.address);
  const [clientName, setClientName] = useState(estate.clientName ?? "");
  const [notes, setNotes] = useState(estate.notes ?? "");

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/estates/${estate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || undefined, address, clientName: clientName || undefined, notes: notes || undefined }),
      });
      if (res.ok) {
        setEditing(false);
        addToast({ type: "success", message: "Estate updated" });
        router.refresh();
      } else {
        addToast({ type: "error", message: "Failed to save changes" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (newStatus === estate.status) return;
    const label = STATUS_OPTIONS.find((o) => o.value === newStatus)?.label ?? newStatus;
    if (!confirm(`Change status to "${label}"?`)) return;

    const res = await fetch(`/api/estates/${estate.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      addToast({ type: "success", message: "Estate status updated" });
      router.refresh();
    } else {
      addToast({ type: "error", message: "Failed to update status" });
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this estate?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/estates/${estate.id}`, { method: "DELETE" });
      if (res.ok) {
        addToast({ type: "success", message: "Estate deleted" });
        router.push("/estates");
      } else {
        const body = await res.json().catch(() => null);
        const message = body?.error === "Cannot delete estate with items"
          ? "Delete all items first"
          : "Failed to delete estate";
        addToast({ type: "error", message });
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleLoadMore() {
    if (!currentCursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/estates/${estate.id}/items?cursor=${currentCursor}`);
      if (res.ok) {
        const data = await res.json();
        setMoreItems((prev) => [...prev, ...data.items]);
        setCurrentCursor(data.nextCursor ?? null);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleSwipeDisposition(itemId: string, disposition: Disposition) {
    const item = allItems.find((i) => i.id === itemId);
    const previousStatus = item?.status;
    const previousDisposition = item?.disposition;
    const res = await fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disposition }),
    });
    if (res.ok) {
      addToast({
        type: "success",
        message: "Disposition set",
        action: {
          label: "Undo",
          onClick: async () => {
            const revertStatus = previousStatus === "triaged" || previousStatus === "routed"
              ? previousStatus
              : "routed";
            const body: Record<string, unknown> = { disposition: previousDisposition ?? null };
            if (previousStatus !== "resolved") {
              body.status = revertStatus;
            }
            const undoRes = await fetch(`/api/items/${itemId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            if (undoRes.ok) router.refresh();
          },
        },
      });
      router.refresh();
    } else {
      addToast({ type: "error", message: "Failed to set disposition" });
    }
  }

  const allItems = [...items, ...moreItems];

  const showClosePrompt =
    estate.status === "resolving" && canCloseEstate(allItems);
  const closeStats = showClosePrompt ? getCloseEstateStats(items) : null;

  return (
    <div className="lg:flex lg:gap-8">
      {/* Left column: Estate info */}
      <div className="lg:w-2/5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{estate.name ?? estate.address}</h1>
            {estate.name && (
              <div className="mt-1 flex items-center gap-1.5 text-sm text-text-secondary">
                <MapPin size={14} />
                <span>{estate.address}</span>
              </div>
            )}
          </div>
          <StatusBadge status={estate.status} />
        </div>

        {/* Metadata */}
        {estate.clientName && (
          <div className="mt-4">
            <span className="text-xs font-medium text-text-muted">Client</span>
            <p className="text-sm text-text-secondary">{estate.clientName}</p>
          </div>
        )}
        {estate.notes && (
          <div className="mt-3">
            <span className="text-xs font-medium text-text-muted">Notes</span>
            <p className="text-sm text-text-secondary">{estate.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 min-h-[44px] text-sm text-text-secondary transition-colors hover:bg-surface-raised"
          >
            <Pencil size={14} />
            Edit
          </button>

          <select
            value={estate.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            data-1p-ignore
            aria-label="Estate status"
            className="rounded-md border border-border bg-bg px-3 py-1.5 min-h-[44px] text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {estate.itemCount === 0 && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-400/30 px-3 py-1.5 min-h-[44px] text-sm text-red-400 transition-colors hover:bg-red-400/10"
            >
              <Trash2 size={14} />
              {deleting ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>

        {/* Inline edit form */}
        {editing && (
          <div className="mt-4 space-y-3 rounded-lg border border-border bg-surface p-4" data-1p-ignore>
            <div>
              <label htmlFor="edit-address" className="block text-xs font-medium text-text-muted">Address</label>
              <AddressAutocomplete
                id="edit-address"
                value={address}
                onChange={setAddress}
                inputClassName="mt-1 block w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="edit-name" className="block text-xs font-medium text-text-muted">Estate Name</label>
              <input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                data-1p-ignore
                className="mt-1 block w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="edit-clientName" className="block text-xs font-medium text-text-muted">Client Name</label>
              <input
                id="edit-clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                autoComplete="off"
                data-1p-ignore
                className="mt-1 block w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="edit-notes" className="block text-xs font-medium text-text-muted">Notes</label>
              <textarea
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                autoComplete="off"
                data-1p-ignore
                className="mt-1 block w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setName(estate.name ?? "");
                  setAddress(estate.address);
                  setClientName(estate.clientName ?? "");
                  setNotes(estate.notes ?? "");
                }}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-raised"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Close estate prompt */}
        {showClosePrompt && closeStats && (
          <div className="mt-6 rounded-lg border border-accent/30 bg-accent/5 p-4" data-testid="close-estate-prompt">
            <div className="flex items-center gap-2 text-sm font-medium text-accent">
              <CheckCircle size={16} />
              All {closeStats.totalItems} items resolved. Ready to close this estate.
            </div>
            {(closeStats.totalEstimatedValueLow > 0 || closeStats.totalEstimatedValueHigh > 0) && (
              <p className="mt-1 text-xs text-text-muted">
                Total estimated value: ${closeStats.totalEstimatedValueLow.toLocaleString()} – ${closeStats.totalEstimatedValueHigh.toLocaleString()}
              </p>
            )}
            <button
              onClick={() => handleStatusChange("closed")}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg transition-colors hover:bg-accent/90"
            >
              Close Estate
            </button>
          </div>
        )}
      </div>

      {/* Right column: Items */}
      <div className="mt-8 lg:mt-0 lg:w-3/5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-muted">Items</h2>
          <div className="flex items-center gap-2">
            {estate.status === "active" && pendingItemIds.length > 0 && (
              <BatchTriage estateId={estate.id} pendingItemIds={pendingItemIds} />
            )}
            {estate.itemCount > 0 && (
              <Link
                href={`/estates/${estate.id}/labels`}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border px-3 py-1.5 min-h-[44px] text-sm text-text-secondary transition-colors hover:bg-surface-raised"
              >
                <Tag size={14} />
                Labels
              </Link>
            )}
            {estate.status === "active" && (
              <Link
                href={`/estates/${estate.id}/upload`}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg transition-colors hover:bg-accent/90"
              >
                <Camera size={14} />
                Upload
              </Link>
            )}
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div className="mt-3">
            <EstateSummaryPanel summary={summary} />
          </div>
        )}

        {/* Filters */}
        {allItems.length > 0 && (
          <div className="mt-3">
            <ItemFilters
              tierFilter={tierFilter}
              statusFilter={statusFilter}
              onTierChange={setTierFilter}
              onStatusChange={setStatusFilter}
            />
          </div>
        )}

        {allItems.length > 0 ? (
          <div className="mt-3 space-y-2">
            {allItems
              .filter((item) => {
                if (tierFilter && item.tier !== tierFilter) return false;
                if (statusFilter && item.status !== statusFilter) return false;
                return true;
              })
              .map((item) => {
                const canSwipe = item.status === "triaged" || item.status === "routed";
                return canSwipe ? (
                  <SwipeableItemCard key={item.id} itemId={item.id} onDisposition={handleSwipeDisposition}>
                    <ItemCard {...item} />
                  </SwipeableItemCard>
                ) : (
                  <ItemCard key={item.id} {...item} />
                );
              })}

            {/* Load More */}
            {currentCursor && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="mt-2 w-full rounded-md border border-border py-2 text-sm text-text-secondary transition-colors hover:bg-surface-raised disabled:opacity-50"
              >
                {loadingMore ? "Loading..." : "Load More"}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-3 flex flex-col items-center rounded-lg border border-dashed border-border py-10 text-center">
            <Package size={24} className="text-text-muted" />
            <p className="mt-2 text-sm text-text-secondary">
              No items yet. Grab your camera.
            </p>
            {estate.status === "active" && (
              <Link
                href={`/estates/${estate.id}/upload`}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent/90"
              >
                <Camera size={14} />
                Upload
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
