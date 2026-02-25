import { eq, count } from "drizzle-orm";
import { db } from "@/db";
import { estates, items } from "@/db/schema";
import { getAuthUserId, jsonError, jsonSuccess } from "@/lib/api";
import { parseUpdateEstate } from "@/lib/validations/estate";

type Params = { params: Promise<{ id: string }> };

const VALID_TRANSITIONS: Record<string, string[]> = {
  active: ["resolving"],
  resolving: ["closed"],
  closed: [],
};

export async function GET(_request: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const { id } = await params;

  const [estate] = await db
    .select()
    .from(estates)
    .where(eq(estates.id, id));

  if (!estate) return jsonError("Not found", 404);
  if (estate.userId !== userId) return jsonError("Forbidden", 403);

  return jsonSuccess(estate);
}

export async function PATCH(request: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const { id } = await params;

  const [estate] = await db
    .select()
    .from(estates)
    .where(eq(estates.id, id));

  if (!estate) return jsonError("Not found", 404);
  if (estate.userId !== userId) return jsonError("Forbidden", 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const parsed = parseUpdateEstate(body);
  if (!parsed.success) {
    return jsonError({ error: "Validation failed", details: parsed.error.issues }, 400);
  }

  // Status transition validation
  if (parsed.data.status && parsed.data.status !== estate.status) {
    const allowed = VALID_TRANSITIONS[estate.status] ?? [];
    if (!allowed.includes(parsed.data.status)) {
      return jsonError(
        `Invalid status transition: ${estate.status} → ${parsed.data.status}`,
        400,
      );
    }
  }

  const [updated] = await db
    .update(estates)
    .set(parsed.data)
    .where(eq(estates.id, id))
    .returning();

  return jsonSuccess(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const { id } = await params;

  const [estate] = await db
    .select()
    .from(estates)
    .where(eq(estates.id, id));

  if (!estate) return jsonError("Not found", 404);
  if (estate.userId !== userId) return jsonError("Forbidden", 403);

  const [{ itemCount }] = await db
    .select({ itemCount: count() })
    .from(items)
    .where(eq(items.estateId, id));

  if (itemCount > 0) {
    return jsonError("Cannot delete estate with items", 409);
  }

  await db.delete(estates).where(eq(estates.id, id));

  return jsonSuccess({ deleted: true });
}
