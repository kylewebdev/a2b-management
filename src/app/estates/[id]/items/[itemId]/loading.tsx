import { Shell } from "@/components/shell";
import { Skeleton } from "@/components/skeleton";

export default function ItemDetailLoading() {
  return (
    <Shell>
      <div className="mx-auto max-w-6xl p-6">
        <Skeleton className="h-4 w-32" />
        <div className="mt-4 lg:flex lg:gap-8">
          <div className="lg:w-1/2">
            <Skeleton className="aspect-[4/3] w-full" />
            <div className="mt-2 flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-16" />
              ))}
            </div>
          </div>
          <div className="mt-6 lg:mt-0 lg:w-1/2 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    </Shell>
  );
}
