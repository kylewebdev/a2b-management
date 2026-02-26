"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Trash2, DollarSign, X, Printer } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/toast";
import { TriageDisplay } from "./triage-display";
import { RoutingGuidance } from "./routing-guidance";
import { DispositionSelector } from "./disposition-selector";
import { ItemLabel } from "@/components/item-label";

interface Photo {
  id: string;
  url: string;
  originalFilename: string;
}

interface Item {
  id: string;
  estateId: string;
  tier: "1" | "2" | "3" | "4" | null;
  status: "pending" | "triaged" | "routed" | "resolved";
  notes: string | null;
  disposition: string | null;
  aiIdentification: { title?: string; description?: string; category?: string } | null;
  aiValuation: {
    lowEstimate?: number;
    highEstimate?: number;
    confidence?: string;
    condition?: string;
    comparables?: string[];
    listingGuidance?: { platforms?: string[]; keywords?: string[]; description?: string } | null;
    sleeperAlert?: string | null;
    additionalPhotosRequested?: string[] | null;
  } | null;
  salePrice: number | null;
  photos: Photo[];
}

export function ItemDetail({ item }: { item: Item }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [salePriceInput, setSalePriceInput] = useState(item.salePrice != null ? String(item.salePrice) : "");
  const [saving, setSaving] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this item and all its photos?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
      if (res.ok) {
        addToast({ type: "success", message: "Item deleted" });
        router.push(`/estates/${item.estateId}`);
      } else {
        addToast({ type: "error", message: "Failed to delete item" });
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveNotes() {
    setSaving(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes || null }),
      });
      if (res.ok) {
        addToast({ type: "success", message: "Notes saved" });
        router.refresh();
      } else {
        addToast({ type: "error", message: "Failed to save notes" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePrice() {
    const value = salePriceInput.trim();
    const parsed = value === "" ? null : parseInt(value, 10);
    if (parsed !== null && (isNaN(parsed) || parsed < 0)) {
      addToast({ type: "error", message: "Enter a valid price" });
      return;
    }
    setSavingPrice(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salePrice: parsed }),
      });
      if (res.ok) {
        addToast({ type: "success", message: parsed !== null ? "Price set" : "Price cleared" });
        router.refresh();
      } else {
        addToast({ type: "error", message: "Failed to save price" });
      }
    } finally {
      setSavingPrice(false);
    }
  }

  async function handleClearPrice() {
    setSalePriceInput("");
    setSavingPrice(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salePrice: null }),
      });
      if (res.ok) {
        addToast({ type: "success", message: "Price cleared" });
        router.refresh();
      } else {
        addToast({ type: "error", message: "Failed to clear price" });
      }
    } finally {
      setSavingPrice(false);
    }
  }

  const currentPhoto = item.photos[selectedPhoto];

  return (
    <div>
      {/* Back link */}
      <Link
        href={`/estates/${item.estateId}`}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        Back to estate
      </Link>

      <div className="mt-4 lg:flex lg:gap-8">
        {/* Left column: Photos */}
        <div className="lg:w-1/2">
          {item.photos.length > 0 && (
            <div>
              {/* Main photo */}
              <div className="aspect-[4/3] overflow-hidden rounded-lg bg-surface-raised">
                {currentPhoto && (
                  <img
                    src={currentPhoto.url}
                    alt={currentPhoto.originalFilename}
                    className="h-full w-full object-contain"
                  />
                )}
              </div>

              {/* Thumbnail strip */}
              {item.photos.length > 1 && (
                <div className="mt-2 flex gap-2 overflow-x-auto" data-testid="thumbnail-strip">
                  {item.photos.map((photo, i) => (
                    <button
                      key={photo.id}
                      onClick={() => setSelectedPhoto(i)}
                      className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                        i === selectedPhoto
                          ? "border-accent"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={photo.url}
                        alt={`Photo ${i + 1}`}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: Details */}
        <div className="mt-6 lg:mt-0 lg:w-1/2">
          {/* AI Triage */}
          <TriageDisplay
            itemId={item.id}
            itemStatus={item.status}
            existingResult={{
              tier: item.tier,
              aiIdentification: item.aiIdentification,
              aiValuation: item.aiValuation,
            }}
          />

          {/* Routing Guidance */}
          {item.tier && (
            <RoutingGuidance
              itemId={item.id}
              status={item.status}
              tier={item.tier}
              valuation={item.aiValuation}
            />
          )}

          {/* Disposition */}
          <DispositionSelector
            itemId={item.id}
            status={item.status}
            disposition={item.disposition}
          />

          {/* Sale Price */}
          {item.status !== "pending" && (
            <div className="mt-4">
              <h2 className="text-xs font-medium text-text-muted">Sale Price</h2>
              <div className="mt-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <DollarSign size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={salePriceInput}
                    onChange={(e) => setSalePriceInput(e.target.value)}
                    autoComplete="off"
                    data-1p-ignore
                    placeholder="Set a price"
                    className="block w-full rounded-md border border-border bg-bg py-1.5 pl-8 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
                  />
                </div>
                {item.salePrice != null && (
                  <button
                    onClick={handleClearPrice}
                    disabled={savingPrice}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-raised hover:text-text-secondary disabled:opacity-50"
                    title="Clear price"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              {salePriceInput !== (item.salePrice != null ? String(item.salePrice) : "") && (
                <button
                  onClick={handleSavePrice}
                  disabled={savingPrice}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg transition-colors hover:bg-accent/90 disabled:opacity-50"
                >
                  {savingPrice ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      Save Price
                    </>
                  )}
                </button>
              )}
              {item.aiValuation?.lowEstimate != null && item.aiValuation?.highEstimate != null && (
                <p className="mt-1.5 text-xs text-text-muted">
                  AI estimate: ${item.aiValuation.lowEstimate.toLocaleString()} – ${item.aiValuation.highEstimate.toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Print Label */}
          {item.status !== "pending" && (
            <div className="mt-4">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 min-h-[44px] text-sm text-text-secondary transition-colors hover:bg-surface-raised"
              >
                <Printer size={14} />
                Print Label
              </button>
              {/* Hidden label for print */}
              <div className="hidden print:block print:fixed print:inset-0 print:z-50 print:bg-white print:p-8">
                <ItemLabel
                  itemId={item.id}
                  estateId={item.estateId}
                  salePrice={item.salePrice}
                  baseUrl={typeof window !== "undefined" ? window.location.origin : ""}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="mt-4">
            <h2 className="text-xs font-medium text-text-muted">Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              autoComplete="off"
              data-1p-ignore
              placeholder="Add notes about this item..."
              className="mt-1 block w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
            />
            {notes !== (item.notes ?? "") && (
              <button
                onClick={handleSaveNotes}
                disabled={saving}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Save Notes
                  </>
                )}
              </button>
            )}
          </div>

          {/* Delete */}
          <div className="mt-8 border-t border-border pt-4">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-400/30 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-400/10 disabled:opacity-50"
            >
              <Trash2 size={14} />
              {deleting ? "Deleting..." : "Delete Item"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
