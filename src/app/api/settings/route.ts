import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { getAuthUserId, jsonError, jsonSuccess } from "@/lib/api";
import { encrypt, decrypt, maskApiKey } from "@/lib/crypto";
import { updateSettingsSchema } from "@/lib/validations/settings";

const SETTINGS_ID = 1;

const DEFAULTS = {
  aiProvider: "anthropic" as const,
  aiModel: null,
  apiKeyAnthropic: null,
  apiKeyOpenai: null,
  apiKeyGoogle: null,
  costWarningThreshold: null,
};

function maskKey(encrypted: string | null): string | null {
  if (!encrypted) return null;
  try {
    const decrypted = decrypt(encrypted);
    return maskApiKey(decrypted);
  } catch {
    return null;
  }
}

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, SETTINGS_ID));

  if (!row) {
    return jsonSuccess({
      ...DEFAULTS,
      updatedAt: null,
      updatedBy: null,
    });
  }

  return jsonSuccess({
    aiProvider: row.aiProvider,
    aiModel: row.aiModel,
    apiKeyAnthropic: maskKey(row.apiKeyAnthropic),
    apiKeyOpenai: maskKey(row.apiKeyOpenai),
    apiKeyGoogle: maskKey(row.apiKeyGoogle),
    costWarningThreshold: row.costWarningThreshold,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  });
}

export async function PUT(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError({ error: "Validation failed", details: parsed.error.issues }, 400);
  }

  const data = parsed.data;

  // Build the update payload, encrypting API keys
  const updatePayload: Record<string, unknown> = {
    updatedBy: userId,
  };

  if (data.aiProvider !== undefined) updatePayload.aiProvider = data.aiProvider;
  if (data.aiModel !== undefined) updatePayload.aiModel = data.aiModel;
  if (data.apiKeyAnthropic !== undefined) {
    updatePayload.apiKeyAnthropic = data.apiKeyAnthropic ? encrypt(data.apiKeyAnthropic) : null;
  }
  if (data.apiKeyOpenai !== undefined) {
    updatePayload.apiKeyOpenai = data.apiKeyOpenai ? encrypt(data.apiKeyOpenai) : null;
  }
  if (data.apiKeyGoogle !== undefined) {
    updatePayload.apiKeyGoogle = data.apiKeyGoogle ? encrypt(data.apiKeyGoogle) : null;
  }
  if (data.costWarningThreshold !== undefined) {
    updatePayload.costWarningThreshold = data.costWarningThreshold;
  }

  // Upsert: try update first, insert if not found
  const [existing] = await db
    .select({ id: appSettings.id })
    .from(appSettings)
    .where(eq(appSettings.id, SETTINGS_ID));

  let row;
  if (existing) {
    [row] = await db
      .update(appSettings)
      .set(updatePayload)
      .where(eq(appSettings.id, SETTINGS_ID))
      .returning();
  } else {
    [row] = await db
      .insert(appSettings)
      .values({ id: SETTINGS_ID, ...updatePayload })
      .returning();
  }

  return jsonSuccess({
    aiProvider: row.aiProvider,
    aiModel: row.aiModel,
    apiKeyAnthropic: maskKey(row.apiKeyAnthropic),
    apiKeyOpenai: maskKey(row.apiKeyOpenai),
    apiKeyGoogle: maskKey(row.apiKeyGoogle),
    costWarningThreshold: row.costWarningThreshold,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  });
}
