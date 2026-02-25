import { Shell } from "@/components/shell";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id, itemId } = await params;

  return (
    <Shell>
      <div className="p-6">
        <h1 className="text-xl font-bold">Item {itemId}</h1>
        <p className="text-sm text-text-muted">Estate {id}</p>
        <p className="mt-6 text-text-secondary">
          Item detail goes here.
        </p>
      </div>
    </Shell>
  );
}
