import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { db } from "@/db";
import { estates } from "@/db/schema";
import { UploadForm } from "./upload-form";

export default async function UploadPage({
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

  return (
    <Shell>
      <div className="mx-auto max-w-2xl p-6">
        <UploadForm
          estateId={estate.id}
          estateName={estate.name ?? estate.address}
        />
      </div>
    </Shell>
  );
}
