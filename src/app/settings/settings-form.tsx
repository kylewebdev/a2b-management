"use client";

import { useState, useEffect } from "react";
import { Loader2, Check, AlertTriangle } from "lucide-react";

type Provider = "anthropic" | "openai" | "google";

interface Settings {
  aiProvider: Provider;
  aiModel: string | null;
  apiKeyAnthropic: string | null;
  apiKeyOpenai: string | null;
  apiKeyGoogle: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
};

const PROVIDER_KEY_FIELD: Record<Provider, keyof Settings> = {
  anthropic: "apiKeyAnthropic",
  openai: "apiKeyOpenai",
  google: "apiKeyGoogle",
};

const PROVIDER_KEY_PLACEHOLDER: Record<Provider, string> = {
  anthropic: "sk-ant-...",
  openai: "sk-...",
  google: "AIza...",
};

const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
  google: "gemini-2.0-flash",
};

export function SettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setSettings(data);
        setProvider(data.aiProvider);
        setModel(data.aiModel ?? "");
      } catch {
        setLoadError("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveStatus("idle");

    const keyField = PROVIDER_KEY_FIELD[provider];

    const body: Record<string, unknown> = {
      aiProvider: provider,
      aiModel: model || null,
    };

    // Only send API key if the user typed one (don't overwrite with empty)
    if (apiKey) {
      body[keyField] = apiKey;
    }

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setSaveStatus("error");
        return;
      }

      const updated = await res.json();
      setSettings(updated);
      setApiKey(""); // Clear the input after save
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-secondary" data-testid="settings-loading">
        <Loader2 size={16} className="animate-spin" />
        Loading settings...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-400">
        <AlertTriangle size={16} />
        {loadError}
      </div>
    );
  }

  const maskedKey = settings ? (settings[PROVIDER_KEY_FIELD[provider]] as string | null) : null;

  return (
    <form onSubmit={handleSave} className="space-y-6" data-1p-ignore>
      {/* Provider */}
      <div>
        <label htmlFor="ai-provider" className="block text-xs font-medium text-text-muted">
          AI Provider
        </label>
        <select
          id="ai-provider"
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value as Provider);
            setApiKey("");
            setSaveStatus("idle");
          }}
          className="mt-1 block w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
        >
          {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* API Key */}
      <div>
        <label htmlFor="api-key" className="block text-xs font-medium text-text-muted">
          {PROVIDER_LABELS[provider]} API Key
        </label>
        {maskedKey && (
          <p className="mt-1 text-xs text-text-secondary">
            Current key: <span className="font-mono">{maskedKey}</span>
          </p>
        )}
        <input
          id="api-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={maskedKey ? "Enter new key to replace" : PROVIDER_KEY_PLACEHOLDER[provider]}
          autoComplete="off"
          data-1p-ignore
          className="mt-1 block w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
        />
      </div>

      {/* Model Override */}
      <div>
        <label htmlFor="model-override" className="block text-xs font-medium text-text-muted">
          Model Override
        </label>
        <input
          id="model-override"
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={DEFAULT_MODELS[provider]}
          autoComplete="off"
          data-1p-ignore
          className="mt-1 block w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
        />
        <p className="mt-1 text-xs text-text-muted">
          Leave blank to use default ({DEFAULT_MODELS[provider]})
        </p>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Saving...
            </>
          ) : (
            "Save"
          )}
        </button>

        {saveStatus === "saved" && (
          <span className="inline-flex items-center gap-1 text-sm text-accent">
            <Check size={14} />
            Saved
          </span>
        )}
        {saveStatus === "error" && (
          <span className="inline-flex items-center gap-1 text-sm text-red-400">
            <AlertTriangle size={14} />
            Failed to save
          </span>
        )}
      </div>
    </form>
  );
}
