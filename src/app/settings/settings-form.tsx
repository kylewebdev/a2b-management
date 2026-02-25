"use client";

import { useState, useEffect } from "react";
import { Loader2, Check, AlertTriangle, Info } from "lucide-react";

type Provider = "anthropic" | "openai" | "google";

interface Settings {
  aiProvider: Provider;
  aiModel: string | null;
  apiKeyAnthropic: string | null;
  apiKeyOpenai: string | null;
  apiKeyGoogle: string | null;
  costWarningThreshold: number | null;
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

const MODELS_BY_PROVIDER: Record<Provider, { value: string; label: string }[]> = {
  anthropic: [
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4 (default)" },
    { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  ],
  openai: [
    { value: "gpt-4o", label: "GPT-4o (default)" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4.1", label: "GPT-4.1" },
  ],
  google: [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash (default)" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
  ],
};

const inputClass =
  "mt-1 block w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none";

export function SettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [costThreshold, setCostThreshold] = useState("");

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  // Test key state
  const [testingKey, setTestingKey] = useState(false);
  const [testKeyResult, setTestKeyResult] = useState<{ valid: boolean; error?: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setSettings(data);
        setProvider(data.aiProvider);
        setModel(data.aiModel ?? "");
        setCostThreshold(data.costWarningThreshold != null ? String(data.costWarningThreshold) : "");
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
      costWarningThreshold: costThreshold ? parseInt(costThreshold, 10) : null,
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

  async function handleTestKey() {
    setTestingKey(true);
    setTestKeyResult(null);

    try {
      const res = await fetch("/api/settings/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, model: model || undefined }),
      });
      const data = await res.json();
      setTestKeyResult(data);
    } catch {
      setTestKeyResult({ valid: false, error: "Network error" });
    } finally {
      setTestingKey(false);
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
  const models = MODELS_BY_PROVIDER[provider];

  return (
    <form onSubmit={handleSave} className="space-y-6" data-1p-ignore>
      {/* Info Banner */}
      <div className="flex items-start gap-2 rounded-md border border-border bg-surface p-3 text-xs text-text-secondary">
        <Info size={14} className="mt-0.5 shrink-0 text-accent" />
        <span>These settings affect all users. Changes to the AI provider or API key will apply to every triage going forward.</span>
      </div>

      {/* Provider */}
      <div>
        <label htmlFor="ai-provider" className="block text-xs font-medium text-text-muted">
          AI Provider
        </label>
        <select
          id="ai-provider"
          value={provider}
          onChange={(e) => {
            const newProvider = e.target.value as Provider;
            setProvider(newProvider);
            setModel("");
            setApiKey("");
            setSaveStatus("idle");
            setTestKeyResult(null);
          }}
          className={inputClass}
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
        <div className="mt-1 flex gap-2">
          <input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setTestKeyResult(null);
            }}
            placeholder={maskedKey ? "Enter new key to replace" : PROVIDER_KEY_PLACEHOLDER[provider]}
            autoComplete="off"
            data-1p-ignore
            className={`${inputClass} mt-0 flex-1`}
          />
          <button
            type="button"
            disabled={!apiKey || testingKey}
            onClick={handleTestKey}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:opacity-50 disabled:hover:border-border disabled:hover:text-text-secondary"
          >
            {testingKey ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Testing...
              </>
            ) : (
              "Test Key"
            )}
          </button>
        </div>
        {testKeyResult && (
          <p className={`mt-1 text-xs ${testKeyResult.valid ? "text-accent" : "text-red-400"}`}>
            {testKeyResult.valid ? (
              <span className="inline-flex items-center gap-1">
                <Check size={12} />
                Key is valid
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <AlertTriangle size={12} />
                {testKeyResult.error}
              </span>
            )}
          </p>
        )}
      </div>

      {/* Model */}
      <div>
        <label htmlFor="model" className="block text-xs font-medium text-text-muted">
          Model
        </label>
        <select
          id="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className={inputClass}
        >
          <option value="">Default ({models[0].label.replace(" (default)", "")})</option>
          {models.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Cost Warning Threshold */}
      <div>
        <label htmlFor="cost-threshold" className="block text-xs font-medium text-text-muted">
          Cost Warning Threshold ($)
        </label>
        <input
          id="cost-threshold"
          type="number"
          min="1"
          step="1"
          value={costThreshold}
          onChange={(e) => setCostThreshold(e.target.value)}
          placeholder="e.g. 50"
          autoComplete="off"
          data-1p-ignore
          className={inputClass}
        />
        <p className="mt-1 text-xs text-text-muted">
          Show a warning when estimated spend exceeds this amount. Leave blank to disable.
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
