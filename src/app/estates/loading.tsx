import { Shell } from "@/components/shell";
import { Skeleton } from "@/components/skeleton";

export default function EstatesLoading() {
  return (
    <Shell>
      <div className="mx-auto max-w-6xl p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    </Shell>
  );
}
