import { Shell } from "@/components/shell";

export default async function EstateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Shell>
      <div className="p-6">
        <h1 className="text-xl font-bold">Estate {id}</h1>
        <p className="mt-6 text-text-secondary">
          No items yet. Time to start digging.
        </p>
      </div>
    </Shell>
  );
}
