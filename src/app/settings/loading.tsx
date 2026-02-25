import { Shell } from "@/components/shell";
import { Skeleton } from "@/components/skeleton";

export default function SettingsLoading() {
  return (
    <Shell>
      <div className="mx-auto max-w-2xl p-6">
        <Skeleton className="h-7 w-24" />
        <div className="mt-6 space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
    </Shell>
  );
}
