import { NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { estates, items } from "@/db/schema";
import { getAuthUserId, jsonError, jsonSuccess } from "@/lib/api";
import { createEstateSchema } from "@/lib/validations/estate";

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const parsed = createEstateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError({ error: "Validation failed", details: parsed.error.issues }, 400);
  }

  const [estate] = await db
    .insert(estates)
    .values({ ...parsed.data, userId })
    .returning();

  return jsonSuccess(estate, 201);
}

const statusFilter = z.enum(["active", "resolving", "closed"]);

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");

  const conditions = [eq(estates.userId, userId)];

  if (statusParam) {
    const parsed = statusFilter.safeParse(statusParam);
    if (!parsed.success) {
      return jsonError("Invalid status filter", 400);
    }
    conditions.push(eq(estates.status, parsed.data));
  }

  const itemCountSq = sql<number>`(SELECT count(*)::int FROM ${items} WHERE ${items.estateId} = ${estates.id})`;

  const result = await db
    .select({
      id: estates.id,
      name: estates.name,
      address: estates.address,
      status: estates.status,
      clientName: estates.clientName,
      notes: estates.notes,
      userId: estates.userId,
      createdAt: estates.createdAt,
      updatedAt: estates.updatedAt,
      itemCount: itemCountSq,
    })
    .from(estates)
    .where(conditions.length === 1 ? conditions[0] : sql`${conditions[0]} AND ${conditions[1]}`)
    .orderBy(estates.createdAt);

  return jsonSuccess(result);
}
