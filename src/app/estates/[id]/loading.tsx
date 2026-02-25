import { Shell } from "@/components/shell";
import { Skeleton } from "@/components/skeleton";

export default function EstateDetailLoading() {
  return (
    <Shell>
      <div className="mx-auto max-w-6xl p-6">
        <div className="lg:flex lg:gap-8">
          <div className="lg:w-2/5 space-y-4">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
          <div className="mt-8 lg:mt-0 lg:w-3/5 space-y-3">
            <Skeleton className="h-5 w-16" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
