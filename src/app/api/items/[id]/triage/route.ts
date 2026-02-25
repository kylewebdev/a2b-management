import { eq } from "drizzle-orm";
import { db } from "@/db";
import { estates, items, itemPhotos, appSettings } from "@/db/schema";
import { getAuthUserId, jsonError, jsonSuccess } from "@/lib/api";
import { decrypt } from "@/lib/crypto";

type Params = { params: Promise<{ id: string }> };

const PROVIDER_KEY_MAP = {
  anthropic: "apiKeyAnthropic",
  openai: "apiKeyOpenai",
  google: "apiKeyGoogle",
} as const;

export async function POST(_request: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const { id } = await params;

  // Fetch item
  const [item] = await db
    .select()
    .from(items)
    .where(eq(items.id, id));

  if (!item) return jsonError("Not found", 404);

  // Verify estate ownership
  const [estate] = await db
    .select()
    .from(estates)
    .where(eq(estates.id, item.estateId));

  if (!estate || estate.userId !== userId) {
    return jsonError("Forbidden", 403);
  }

  // Check item has photos
  const photos = await db
    .select()
    .from(itemPhotos)
    .where(eq(itemPhotos.itemId, id));

  if (photos.length === 0) {
    return jsonError("Item has no photos to triage", 400);
  }

  // Check settings / API key configured
  const [settings] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, 1));

  if (!settings) {
    return jsonError("AI settings not configured. Add an API key in Settings.", 400);
  }

  const keyField = PROVIDER_KEY_MAP[settings.aiProvider];
  const encryptedKey = settings[keyField];

  if (!encryptedKey) {
    return jsonError(`No API key configured for ${settings.aiProvider}. Add one in Settings.`, 400);
  }

  // Verify key is decryptable
  try {
    decrypt(encryptedKey);
  } catch {
    return jsonError("API key is corrupted. Please re-enter it in Settings.", 400);
  }

  return jsonSuccess({ status: "accepted", itemId: id }, 202);
}
