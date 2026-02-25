import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { Shell } from "@/components/shell";
import { SettingsForm } from "./settings-form";
import { UsageDashboard } from "./usage-dashboard";

export default async function SettingsPage() {
  const [settings] = await db
    .select({ costWarningThreshold: appSettings.costWarningThreshold })
    .from(appSettings)
    .where(eq(appSettings.id, 1));

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

        <div className="mt-10">
          <h2 className="text-lg font-bold">Token Usage</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Estimated AI costs across all estates.
          </p>
          <div className="mt-4">
            <UsageDashboard costWarningThreshold={settings?.costWarningThreshold ?? null} />
          </div>
        </div>
      </div>
    </Shell>
  );
}
