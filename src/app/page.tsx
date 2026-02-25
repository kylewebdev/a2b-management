import { Shell } from "@/components/shell";

export default function DashboardPage() {
  return (
    <Shell>
      <div className="p-6">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="mt-6 text-text-secondary">
          No active estates. Time to start digging.
        </p>
      </div>
    </Shell>
  );
}
