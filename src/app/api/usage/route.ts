import { eq, sql, inArray, gte, and } from "drizzle-orm";
import { db } from "@/db";
import { estates, items } from "@/db/schema";
import { getAuthUserId, jsonError, jsonSuccess } from "@/lib/api";
import { calculateCost, estimateCostFromTotal } from "@/lib/cost-calculator";

function computeCost(
  provider: string | null,
  inputTokens: number,
  outputTokens: number,
  totalTokens: number
): number {
  if (!provider) return 0;
  const [prov, model] = provider.includes("/")
    ? provider.split("/", 2)
    : [provider, ""];

  if (inputTokens > 0 || outputTokens > 0) {
    return calculateCost(prov, model, inputTokens, outputTokens);
  }
  if (totalTokens > 0) {
    return estimateCostFromTotal(prov, model, totalTokens);
  }
  return 0;
}

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  // Get user's estates
  const userEstates = await db
    .select({ id: estates.id })
    .from(estates)
    .where(eq(estates.userId, userId));

  const estateIds = userEstates.map((e) => e.id);

  if (estateIds.length === 0) {
    return jsonSuccess({
      lifetime: { totalTokens: 0, totalCost: 0, triageCount: 0, byProvider: [] },
      today: { totalTokens: 0, totalCost: 0, triageCount: 0 },
      byEstate: [],
    });
  }

  // Lifetime aggregate by provider
  const lifetimeRows = await db
    .select({
      aiProvider: items.aiProvider,
      totalInput: sql<number>`coalesce(sum(${items.inputTokens}), 0)::int`,
      totalOutput: sql<number>`coalesce(sum(${items.outputTokens}), 0)::int`,
      totalTokens: sql<number>`coalesce(sum(${items.tokensUsed}), 0)::int`,
      triageCount: sql<number>`count(*)::int`,
    })
    .from(items)
    .where(and(inArray(items.estateId, estateIds), sql`${items.aiProvider} is not null`))
    .groupBy(items.aiProvider);

  // Today aggregate
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const todayRows = await db
    .select({
      aiProvider: items.aiProvider,
      totalInput: sql<number>`coalesce(sum(${items.inputTokens}), 0)::int`,
      totalOutput: sql<number>`coalesce(sum(${items.outputTokens}), 0)::int`,
      totalTokens: sql<number>`coalesce(sum(${items.tokensUsed}), 0)::int`,
      triageCount: sql<number>`count(*)::int`,
    })
    .from(items)
    .where(
      and(
        inArray(items.estateId, estateIds),
        sql`${items.aiProvider} is not null`,
        gte(items.updatedAt, startOfToday)
      )
    )
    .groupBy(items.aiProvider);

  // Per-estate aggregate
  const perEstateRows = await db
    .select({
      estateId: items.estateId,
      estateAddress: estates.address,
      aiProvider: items.aiProvider,
      totalInput: sql<number>`coalesce(sum(${items.inputTokens}), 0)::int`,
      totalOutput: sql<number>`coalesce(sum(${items.outputTokens}), 0)::int`,
      totalTokens: sql<number>`coalesce(sum(${items.tokensUsed}), 0)::int`,
      triageCount: sql<number>`count(*)::int`,
    })
    .from(items)
    .innerJoin(estates, eq(items.estateId, estates.id))
    .where(and(inArray(items.estateId, estateIds), sql`${items.aiProvider} is not null`))
    .groupBy(items.estateId, estates.address, items.aiProvider);

  // Build lifetime response
  const lifetimeByProvider = lifetimeRows.map((row) => {
    const cost = computeCost(row.aiProvider, row.totalInput, row.totalOutput, row.totalTokens);
    return {
      provider: row.aiProvider,
      inputTokens: row.totalInput,
      outputTokens: row.totalOutput,
      totalTokens: row.totalTokens,
      triageCount: row.triageCount,
      cost,
    };
  });

  const lifetimeTotalTokens = lifetimeByProvider.reduce((sum, r) => sum + r.totalTokens, 0);
  const lifetimeTotalCost = Math.round(lifetimeByProvider.reduce((sum, r) => sum + r.cost, 0) * 100) / 100;
  const lifetimeTriageCount = lifetimeByProvider.reduce((sum, r) => sum + r.triageCount, 0);

  // Build today response
  const todayTotalTokens = todayRows.reduce((sum, r) => sum + r.totalTokens, 0);
  const todayTotalCost = Math.round(
    todayRows.reduce((sum, r) => {
      return sum + computeCost(r.aiProvider, r.totalInput, r.totalOutput, r.totalTokens);
    }, 0) * 100
  ) / 100;
  const todayTriageCount = todayRows.reduce((sum, r) => sum + r.triageCount, 0);

  // Build per-estate response
  const byEstate = perEstateRows.map((row) => {
    const cost = computeCost(row.aiProvider, row.totalInput, row.totalOutput, row.totalTokens);
    return {
      estateId: row.estateId,
      estateAddress: row.estateAddress,
      provider: row.aiProvider,
      inputTokens: row.totalInput,
      outputTokens: row.totalOutput,
      totalTokens: row.totalTokens,
      triageCount: row.triageCount,
      cost,
    };
  });

  return jsonSuccess({
    lifetime: {
      totalTokens: lifetimeTotalTokens,
      totalCost: lifetimeTotalCost,
      triageCount: lifetimeTriageCount,
      byProvider: lifetimeByProvider,
    },
    today: {
      totalTokens: todayTotalTokens,
      totalCost: todayTotalCost,
      triageCount: todayTriageCount,
    },
    byEstate,
  });
}
