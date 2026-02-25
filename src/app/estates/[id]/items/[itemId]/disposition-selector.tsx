"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DISPOSITIONS, DISPOSITION_LABELS, type Disposition } from "@/lib/disposition";

interface DispositionSelectorProps {
  itemId: string;
  status: string;
  disposition: string | null;
}

export function DispositionSelector({ itemId, status, disposition }: DispositionSelectorProps) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);

  if (status === "pending") {
    return (
      <div className="mt-4">
        <h2 className="text-xs font-medium text-text-muted">Disposition</h2>
        <p className="mt-1 text-sm text-text-muted">Triage required first</p>
      </div>
    );
  }

  async function handleSelect(value: Disposition) {
    setSaving(value);
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disposition: value }),
      });
      if (res.ok) router.refresh();
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="mt-4">
      <h2 className="text-xs font-medium text-text-muted">Disposition</h2>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {DISPOSITIONS.map((d) => {
          const isActive = disposition === d;
          return (
            <button
              key={d}
              onClick={() => handleSelect(d)}
              disabled={saving !== null}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                isActive
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border bg-surface text-text-secondary hover:bg-surface-raised"
              }`}
            >
              {saving === d ? "..." : DISPOSITION_LABELS[d]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
