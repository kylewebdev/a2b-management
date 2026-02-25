import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { db } from "@/db";
import { estates, items, itemPhotos } from "@/db/schema";
import { getSignedViewUrl } from "@/lib/r2";
import { ItemDetail } from "./item-detail";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id: estateId, itemId } = await params;

  // Fetch item
  const [item] = await db
    .select()
    .from(items)
    .where(eq(items.id, itemId));

  if (!item || item.estateId !== estateId) notFound();

  // Verify estate ownership
  const [estate] = await db
    .select()
    .from(estates)
    .where(eq(estates.id, item.estateId));

  if (!estate || estate.userId !== userId) notFound();

  // Get photos with signed URLs
  const photos = await db
    .select()
    .from(itemPhotos)
    .where(eq(itemPhotos.itemId, itemId))
    .orderBy(itemPhotos.sortOrder);

  const photosWithUrls = await Promise.all(
    photos.map(async (photo) => {
      let url = "";
      try {
        url = await getSignedViewUrl(photo.r2Key);
      } catch {
        // R2 env vars may be missing in dev
      }
      return {
        id: photo.id,
        url,
        originalFilename: photo.originalFilename,
      };
    })
  );

  return (
    <Shell>
      <div className="mx-auto max-w-2xl p-6">
        <ItemDetail
          item={{
            id: item.id,
            estateId: item.estateId,
            tier: item.tier,
            status: item.status,
            notes: item.notes,
            disposition: item.disposition,
            aiIdentification: item.aiIdentification as { title?: string; description?: string } | null,
            aiValuation: item.aiValuation as { estimate?: string } | null,
            photos: photosWithUrls,
          }}
        />
      </div>
    </Shell>
  );
}
