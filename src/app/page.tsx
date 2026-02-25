import { and, eq, sql } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { db } from "@/db";
import { estates, items } from "@/db/schema";
import { Dashboard } from "./dashboard";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

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
    .where(and(eq(estates.userId, userId), eq(estates.status, "active")))
    .orderBy(estates.createdAt);

  const mapped = result.map((e) => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <Shell>
      <div className="p-6">
        <Dashboard estates={mapped} />
      </div>
    </Shell>
  );
}
