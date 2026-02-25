import { Shell } from "@/components/shell";

export default async function UploadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Shell>
      <div className="p-6">
        <h1 className="text-xl font-bold">Upload — Estate {id}</h1>
        <p className="mt-6 text-text-secondary">
          Upload interface goes here.
        </p>
      </div>
    </Shell>
  );
}
