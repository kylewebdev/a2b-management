"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Pencil, Trash2, Package, Camera } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { ItemCard } from "@/components/item-card";
import { BatchTriage } from "./batch-triage";

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
}

const NEXT_STATUS: Record<string, { label: string; value: string } | null> = {
  active: { label: "Start Resolving", value: "resolving" },
  resolving: { label: "Close Estate", value: "closed" },
  closed: null,
};

export function EstateDetail({ estate, items = [], pendingItemIds = [] }: { estate: Estate; items?: ItemSummary[]; pendingItemIds?: string[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusAdvance() {
    const next = NEXT_STATUS[estate.status];
    if (!next) return;
    if (!confirm(`${next.label}? This cannot be undone.`)) return;

    const res = await fetch(`/api/estates/${estate.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next.value }),
    });
    if (res.ok) router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this estate?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/estates/${estate.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/estates");
      }
    } finally {
      setDeleting(false);
    }
  }

  const nextStatus = NEXT_STATUS[estate.status];

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
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-raised"
          >
            <Pencil size={14} />
            Edit
          </button>

          {nextStatus && (
            <button
              onClick={handleStatusAdvance}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg transition-colors hover:bg-accent/90"
            >
              {nextStatus.label}
            </button>
          )}

          {estate.itemCount === 0 && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-400/30 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-400/10"
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
              <input
                id="edit-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                autoComplete="off"
                data-1p-ignore
                className="mt-1 block w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
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
      </div>

      {/* Right column: Items */}
      <div className="mt-8 lg:mt-0 lg:w-3/5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-muted">Items</h2>
          <div className="flex items-center gap-2">
            {estate.status === "active" && pendingItemIds.length > 0 && (
              <BatchTriage estateId={estate.id} pendingItemIds={pendingItemIds} />
            )}
            {estate.status === "active" && (
              <Link
                href={`/estates/${estate.id}/upload`}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg transition-colors hover:bg-accent/90"
              >
                <Camera size={14} />
                Upload Photos
              </Link>
            )}
          </div>
        </div>

        {items.length > 0 ? (
          <div className="mt-3 space-y-2">
            {items.map((item) => (
              <ItemCard key={item.id} {...item} />
            ))}
          </div>
        ) : (
          <div className="mt-3 flex flex-col items-center rounded-lg border border-dashed border-border py-10 text-center">
            <Package size={24} className="text-text-muted" />
            <p className="mt-2 text-sm text-text-secondary">
              No items yet. Grab your camera.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
