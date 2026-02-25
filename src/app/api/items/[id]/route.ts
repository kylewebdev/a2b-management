import { eq } from "drizzle-orm";
import { db } from "@/db";
import { estates, items, itemPhotos } from "@/db/schema";
import { getAuthUserId, jsonError, jsonSuccess } from "@/lib/api";
import { getSignedViewUrl, deleteFiles } from "@/lib/r2";
import { updateItemSchema } from "@/lib/validations/item";
import { isValidItemTransition, resolveStatusOnDisposition } from "@/lib/disposition";

type Params = { params: Promise<{ id: string }> };

async function getItemWithOwnerCheck(itemId: string, userId: string) {
  const [item] = await db
    .select()
    .from(items)
    .where(eq(items.id, itemId));

  if (!item) return { error: jsonError("Not found", 404) };

  const [estate] = await db
    .select()
    .from(estates)
    .where(eq(estates.id, item.estateId));

  if (!estate || estate.userId !== userId) {
    return { error: jsonError("Forbidden", 403) };
  }

  return { item, estate };
}

export async function GET(_request: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const result = await getItemWithOwnerCheck(id, userId);
  if ("error" in result) return result.error;

  const { item } = result;

  // Get all photos for this item
  const photos = await db
    .select()
    .from(itemPhotos)
    .where(eq(itemPhotos.itemId, item.id))
    .orderBy(itemPhotos.sortOrder);

  const photosWithUrls = await Promise.all(
    photos.map(async (photo) => ({
      ...photo,
      url: await getSignedViewUrl(photo.r2Key),
    }))
  );

  return jsonSuccess({ ...item, photos: photosWithUrls });
}

export async function PATCH(request: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const result = await getItemWithOwnerCheck(id, userId);
  if ("error" in result) return result.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const parsed = updateItemSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError({ error: "Validation failed", details: parsed.error.issues }, 400);
  }

  const { item } = result;
  const currentStatus = item.status as "pending" | "triaged" | "routed" | "resolved";

  // Build update payload explicitly
  const update: Record<string, unknown> = {};

  if (parsed.data.notes !== undefined) {
    update.notes = parsed.data.notes;
  }

  // Handle disposition
  if (parsed.data.disposition !== undefined) {
    if (parsed.data.disposition !== null) {
      // Setting a disposition — reject if pending
      if (currentStatus === "pending") {
        return jsonError("Item must be triaged before setting disposition", 400);
      }
      update.disposition = parsed.data.disposition;
      const newStatus = resolveStatusOnDisposition(currentStatus);
      if (newStatus) {
        update.status = newStatus;
      }
    } else {
      // Clearing disposition (null)
      update.disposition = null;
    }
  }

  // Handle explicit status transition (only "routed" is accepted by schema)
  if (parsed.data.status) {
    if (!isValidItemTransition(currentStatus, parsed.data.status)) {
      return jsonError(`Invalid transition: ${currentStatus} → ${parsed.data.status}`, 400);
    }
    update.status = parsed.data.status;
  }

  const [updated] = await db
    .update(items)
    .set(update)
    .where(eq(items.id, id))
    .returning();

  return jsonSuccess(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const result = await getItemWithOwnerCheck(id, userId);
  if ("error" in result) return result.error;

  // Get photos to delete from R2
  const photos = await db
    .select()
    .from(itemPhotos)
    .where(eq(itemPhotos.itemId, id));

  const r2Keys = photos.map((p) => p.r2Key);

  // Delete R2 files (best-effort — item delete via cascade is the source of truth)
  if (r2Keys.length > 0) {
    try {
      await deleteFiles(r2Keys);
    } catch {
      // Log but don't block item deletion
    }
  }

  // Delete item (photos cascade)
  await db.delete(items).where(eq(items.id, id));

  return jsonSuccess({ deleted: true });
}
