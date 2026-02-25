"use client";

import { useRef, useState, useCallback } from "react";
import { DISPOSITIONS, DISPOSITION_LABELS, type Disposition } from "@/lib/disposition";

interface SwipeableItemCardProps {
  children: React.ReactNode;
  itemId: string;
  onDisposition: (itemId: string, disposition: Disposition) => void;
}

const SWIPE_THRESHOLD = 80;

export function SwipeableItemCard({ children, itemId, onDisposition }: SwipeableItemCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [swiped, setSwiped] = useState(false);
  const startX = useRef(0);
  const tracking = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only track touch, not mouse (desktop passthrough)
    if (e.pointerType !== "touch") return;
    startX.current = e.clientX;
    tracking.current = true;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!tracking.current) return;
    const dx = e.clientX - startX.current;
    // Only allow right swipe
    if (dx > 0) {
      setOffsetX(Math.min(dx, 200));
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!tracking.current) return;
    tracking.current = false;
    if (offsetX >= SWIPE_THRESHOLD) {
      setSwiped(true);
      setOffsetX(SWIPE_THRESHOLD);
    } else {
      setOffsetX(0);
    }
  }, [offsetX]);

  const handleReset = useCallback(() => {
    setSwiped(false);
    setOffsetX(0);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-lg" data-testid="swipeable-item-card">
      {/* Action buttons revealed behind the card */}
      {swiped && (
        <div
          className="absolute inset-y-0 left-0 flex items-center gap-1 px-2"
          data-testid="swipe-actions"
        >
          {DISPOSITIONS.slice(0, 3).map((d) => (
            <button
              key={d}
              onClick={() => {
                onDisposition(itemId, d);
                handleReset();
              }}
              className="rounded-md bg-surface-raised px-2 py-1 text-xs font-medium text-text-secondary hover:text-accent"
            >
              {DISPOSITION_LABELS[d]}
            </button>
          ))}
          <button
            onClick={handleReset}
            className="rounded-md px-2 py-1 text-xs text-text-muted hover:text-text-primary"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Card content */}
      <div
        style={{ transform: `translateX(${offsetX}px)`, touchAction: "pan-y" }}
        className="relative transition-transform duration-150"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {children}
      </div>
    </div>
  );
}
