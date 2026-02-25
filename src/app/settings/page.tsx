import { Shell } from "@/components/shell";
import { SettingsForm } from "./settings-form";

export default function SettingsPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-lg p-6">
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Configure your AI provider and API key for item triage.
        </p>
        <div className="mt-6">
          <SettingsForm />
        </div>
      </div>
    </Shell>
  );
}
