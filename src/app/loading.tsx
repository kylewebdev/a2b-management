import { Shell } from "@/components/shell";
import { Skeleton } from "@/components/skeleton";

export default function DashboardLoading() {
  return (
    <Shell>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>

        {/* Stat Tiles */}
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>

        {/* Needs Attention section */}
        <div className="mt-6">
          <Skeleton className="h-5 w-36" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>

        {/* Recent Estates section */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
