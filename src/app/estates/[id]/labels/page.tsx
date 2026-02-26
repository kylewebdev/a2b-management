import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { db } from "@/db";
import { estates, items } from "@/db/schema";
import { LabelsView } from "./labels-view";

export default async function LabelsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;

  const [estate] = await db
    .select()
    .from(estates)
    .where(eq(estates.id, id));

  if (!estate || estate.userId !== userId) notFound();

  // Fetch all labelable items (triaged + routed — not pending, not resolved)
  const labelableItems = await db
    .select()
    .from(items)
    .where(
      and(
        eq(items.estateId, id),
        inArray(items.status, ["triaged", "routed"])
      )
    );

  const itemsForLabels = labelableItems.map((item) => ({
    id: item.id,
    estateId: item.estateId,
    tier: item.tier,
    status: item.status as "triaged" | "routed",
    salePrice: item.salePrice,
  }));

  return (
    <Shell>
      <div className="mx-auto max-w-6xl p-6">
        <LabelsView
          estateId={estate.id}
          estateName={estate.name ?? estate.address}
          items={itemsForLabels}
        />
      </div>
    </Shell>
  );
}
