import { eq, sql } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { db } from "@/db";
import { estates, items } from "@/db/schema";
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

  return (
    <Shell>
      <div className="mx-auto max-w-2xl p-6">
        <EstateDetail
          estate={{
            ...estate,
            createdAt: estate.createdAt.toISOString(),
          }}
        />
      </div>
    </Shell>
  );
}
