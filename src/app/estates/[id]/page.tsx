import { eq, desc, sql } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { db } from "@/db";
import { estates, items, itemPhotos } from "@/db/schema";
import { getSignedViewUrl } from "@/lib/r2";
import { EstateDetail } from "./estate-detail";

export default async function EstateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;

  const itemCountSq = sql<number>`(SELECT count(*)::int FROM ${items} WHERE ${items.estateId} = ${estates.id})`;

  const [estate] = await db
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
    .where(eq(estates.id, id));

  if (!estate || estate.userId !== userId) notFound();

  // Fetch items with first photo per item
  const estateItems = await db
    .select()
    .from(items)
    .where(eq(items.estateId, id))
    .orderBy(desc(items.createdAt));

  const itemsWithThumbnails = await Promise.all(
    estateItems.map(async (item) => {
      const [firstPhoto] = await db
        .select()
        .from(itemPhotos)
        .where(eq(itemPhotos.itemId, item.id))
        .orderBy(itemPhotos.sortOrder)
        .limit(1);

      let thumbnailUrl: string | null = null;
      if (firstPhoto) {
        try {
          thumbnailUrl = await getSignedViewUrl(firstPhoto.r2Key);
        } catch {
          // R2 env vars may be missing in dev — fall back gracefully
        }
      }

      const aiValuation = item.aiValuation as {
        lowEstimate?: number;
        highEstimate?: number;
      } | null;

      return {
        id: item.id,
        estateId: item.estateId,
        tier: item.tier,
        status: item.status,
        thumbnailUrl,
        aiIdentification: item.aiIdentification as { title?: string } | null,
        aiValuation: aiValuation
          ? { lowEstimate: aiValuation.lowEstimate, highEstimate: aiValuation.highEstimate }
          : null,
      };
    })
  );

  return (
    <Shell>
      <div className="mx-auto max-w-6xl p-6">
        <EstateDetail
          estate={{
            ...estate,
            createdAt: estate.createdAt.toISOString(),
          }}
          items={itemsWithThumbnails}
          pendingItemIds={estateItems.filter((i) => i.status === "pending").map((i) => i.id)}
        />
      </div>
    </Shell>
  );
}
