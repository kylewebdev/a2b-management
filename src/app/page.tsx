import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import {
  getDashboardStats,
  getAttentionEstates,
  getRankedEstates,
} from "@/lib/dashboard-queries";
import { Dashboard } from "./dashboard";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [stats, attentionEstates, rankedEstates] = await Promise.all([
    getDashboardStats(userId),
    getAttentionEstates(userId),
    getRankedEstates(userId),
  ]);

  return (
    <Shell>
      <div className="p-6">
        <Dashboard
          stats={stats}
          attentionEstates={attentionEstates}
          rankedEstates={rankedEstates}
        />
      </div>
    </Shell>
  );
}
