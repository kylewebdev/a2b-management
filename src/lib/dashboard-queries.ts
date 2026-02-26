import { sql } from "drizzle-orm";
import { db } from "@/db";
import type {
  DashboardStats,
  AttentionEstate,
  RankedEstate,
} from "./dashboard-types";

export async function getDashboardStats(
  userId: string,
): Promise<DashboardStats> {
  const result = await db.execute<{
    active_estates: number;
    items_pending_triage: number;
    items_pending_disposition: number;
    total_estimated_value_low: number;
    total_estimated_value_high: number;
  }>(sql`
    SELECT
      count(DISTINCT e.id)::int AS active_estates,
      count(*) FILTER (WHERE i.status = 'pending')::int AS items_pending_triage,
      count(*) FILTER (WHERE i.status IN ('triaged', 'routed'))::int AS items_pending_disposition,
      coalesce(sum((i.ai_valuation->>'lowEstimate')::numeric) FILTER (WHERE i.ai_valuation IS NOT NULL), 0)::numeric AS total_estimated_value_low,
      coalesce(sum((i.ai_valuation->>'highEstimate')::numeric) FILTER (WHERE i.ai_valuation IS NOT NULL), 0)::numeric AS total_estimated_value_high
    FROM estates e
    LEFT JOIN items i ON i.estate_id = e.id
    WHERE e.user_id = ${userId} AND e.status = 'active'
  `);

  const row = result.rows[0];
  if (!row) {
    return {
      activeEstates: 0,
      itemsPendingTriage: 0,
      itemsPendingDisposition: 0,
      totalEstimatedValueLow: 0,
      totalEstimatedValueHigh: 0,
    };
  }

  return {
    activeEstates: Number(row.active_estates),
    itemsPendingTriage: Number(row.items_pending_triage),
    itemsPendingDisposition: Number(row.items_pending_disposition),
    totalEstimatedValueLow: Number(row.total_estimated_value_low),
    totalEstimatedValueHigh: Number(row.total_estimated_value_high),
  };
}

export async function getAttentionEstates(
  userId: string,
  staleDays = 7,
): Promise<AttentionEstate[]> {
  const result = await db.execute<{
    id: string;
    name: string | null;
    address: string;
    reason: "awaiting_disposition" | "stale" | "low_confidence";
    reason_detail: string;
    item_count: number;
  }>(sql`
    SELECT id, name, address, reason, reason_detail, item_count FROM (
      -- Estates with items awaiting disposition (triaged status)
      SELECT
        e.id,
        e.name,
        e.address,
        'awaiting_disposition' AS reason,
        count(i.id)::int || ' item' || CASE WHEN count(i.id) = 1 THEN '' ELSE 's' END || ' awaiting disposition' AS reason_detail,
        (SELECT count(*)::int FROM items WHERE estate_id = e.id) AS item_count
      FROM estates e
      JOIN items i ON i.estate_id = e.id AND i.status = 'triaged'
      WHERE e.user_id = ${userId} AND e.status = 'active'
      GROUP BY e.id, e.name, e.address

      UNION ALL

      -- Stale estates (no item activity in N days)
      SELECT
        e.id,
        e.name,
        e.address,
        'stale' AS reason,
        'No activity for ' || ${staleDays} || '+ days' AS reason_detail,
        (SELECT count(*)::int FROM items WHERE estate_id = e.id) AS item_count
      FROM estates e
      WHERE e.user_id = ${userId}
        AND e.status = 'active'
        AND coalesce(
          (SELECT max(i.updated_at) FROM items i WHERE i.estate_id = e.id),
          e.updated_at
        ) < now() - make_interval(days => ${staleDays})

      UNION ALL

      -- Estates with low-confidence items
      SELECT
        e.id,
        e.name,
        e.address,
        'low_confidence' AS reason,
        count(i.id)::int || ' low-confidence item' || CASE WHEN count(i.id) = 1 THEN '' ELSE 's' END AS reason_detail,
        (SELECT count(*)::int FROM items WHERE estate_id = e.id) AS item_count
      FROM estates e
      JOIN items i ON i.estate_id = e.id AND i.ai_valuation->>'confidence' = 'low'
      WHERE e.user_id = ${userId} AND e.status = 'active'
      GROUP BY e.id, e.name, e.address
    ) sub
    ORDER BY
      CASE reason
        WHEN 'awaiting_disposition' THEN 1
        WHEN 'low_confidence' THEN 2
        WHEN 'stale' THEN 3
      END
  `);

  // Deduplicate by estate ID, keeping the highest-priority reason
  const seen = new Set<string>();
  const deduped: AttentionEstate[] = [];

  for (const row of result.rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    deduped.push({
      id: row.id,
      name: row.name,
      address: row.address,
      reason: row.reason,
      reasonDetail: row.reason_detail,
      itemCount: Number(row.item_count),
    });
  }

  return deduped;
}

export async function getRankedEstates(
  userId: string,
  limit = 4,
): Promise<RankedEstate[]> {
  const result = await db.execute<{
    id: string;
    name: string | null;
    address: string;
    status: "active" | "resolving" | "closed";
    item_count: number;
    pending_count: number;
    estimated_value_low: number;
    estimated_value_high: number;
    last_activity: string;
  }>(sql`
    SELECT
      e.id,
      e.name,
      e.address,
      e.status,
      count(i.id)::int AS item_count,
      count(i.id) FILTER (WHERE i.status IN ('pending', 'triaged', 'routed'))::int AS pending_count,
      coalesce(sum((i.ai_valuation->>'lowEstimate')::numeric) FILTER (WHERE i.ai_valuation IS NOT NULL), 0)::numeric AS estimated_value_low,
      coalesce(sum((i.ai_valuation->>'highEstimate')::numeric) FILTER (WHERE i.ai_valuation IS NOT NULL), 0)::numeric AS estimated_value_high,
      coalesce(max(i.updated_at), e.updated_at) AS last_activity
    FROM estates e
    LEFT JOIN items i ON i.estate_id = e.id
    WHERE e.user_id = ${userId} AND e.status = 'active'
    GROUP BY e.id, e.name, e.address, e.status, e.updated_at
    ORDER BY
      (extract(epoch FROM now() - coalesce(max(i.updated_at), e.updated_at)))::float
      / (1 + count(i.id) FILTER (WHERE i.status IN ('pending', 'triaged', 'routed'))::float)
      ASC
    LIMIT ${limit}
  `);

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    status: row.status,
    itemCount: Number(row.item_count),
    pendingCount: Number(row.pending_count),
    estimatedValueLow: Number(row.estimated_value_low),
    estimatedValueHigh: Number(row.estimated_value_high),
    lastActivity: String(row.last_activity),
  }));
}
