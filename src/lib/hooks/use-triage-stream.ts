"use client";

import { useState, useCallback, useRef } from "react";
import type { TriageResult, TriageUsage } from "@/lib/ai/types";

export type TriageState = "idle" | "starting" | "streaming" | "complete" | "error";

interface TriageStreamResult {
  state: TriageState;
  streamText: string;
  result: TriageResult | null;
  usage: TriageUsage | null;
  error: string | null;
  startTriage: () => void;
}

export function useTriageStream(itemId: string): TriageStreamResult {
  const [state, setState] = useState<TriageState>("idle");
  const [streamText, setStreamText] = useState("");
  const [result, setResult] = useState<TriageResult | null>(null);
  const [usage, setUsage] = useState<TriageUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startTriage = useCallback(async () => {
    // Reset state
    setState("starting");
    setStreamText("");
    setResult(null);
    setUsage(null);
    setError(null);

    try {
      // Step 1: POST to validate
      const postRes = await fetch(`/api/items/${itemId}/triage`, {
        method: "POST",
      });

      if (!postRes.ok) {
        const body = await postRes.json().catch(() => null);
        throw new Error(body?.error || `Triage failed (${postRes.status})`);
      }

      // Step 2: Open SSE stream
      setState("streaming");
      abortRef.current = new AbortController();

      const sseRes = await fetch(`/api/items/${itemId}/triage/stream`, {
        signal: abortRef.current.signal,
      });

      if (!sseRes.ok || !sseRes.body) {
        const body = await sseRes.json().catch(() => null);
        throw new Error(body?.error || `Stream failed (${sseRes.status})`);
      }

      const reader = sseRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "chunk") {
                setStreamText((prev) => prev + data.text);
              }
            } catch {
              // Skip malformed data lines
            }
          } else if (line.startsWith("event: complete")) {
            // The next data line has the result
            const nextDataLine = lines.find(
              (l, i) => i > lines.indexOf(line) && l.startsWith("data: ")
            );
            if (nextDataLine) {
              try {
                const data = JSON.parse(nextDataLine.slice(6));
                setResult(data.result ?? null);
                setUsage(data.usage ?? null);
              } catch {
                // parse error
              }
            }
            setState("complete");
          } else if (line.startsWith("event: error")) {
            const nextDataLine = lines.find(
              (l, i) => i > lines.indexOf(line) && l.startsWith("data: ")
            );
            if (nextDataLine) {
              try {
                const data = JSON.parse(nextDataLine.slice(6));
                setError(data.error || "Triage failed");
              } catch {
                setError("Triage failed");
              }
            }
            setState("error");
          }
        }
      }

      // If we reach end without complete/error event, mark complete
      setState((prev) => (prev === "streaming" ? "complete" : prev));
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Triage failed");
      setState("error");
    }
  }, [itemId]);

  return { state, streamText, result, usage, error, startTriage };
}
