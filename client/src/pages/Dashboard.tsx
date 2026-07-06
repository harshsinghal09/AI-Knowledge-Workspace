import { useQuery } from "@tanstack/react-query";
import { NavBar } from "../components/NavBar";
import { getDashboardStats } from "../api/dashboard";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-5">
      <p className="label">{label}</p>
      <p className="font-display text-3xl text-ink mt-2">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-stats"], queryFn: getDashboardStats });

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl text-ink mb-1">Dashboard</h1>
        <p className="text-sm text-ink/50 mb-8">A quick look across all your workspaces.</p>

        {isLoading ? (
          <p className="text-sm text-ink/40 font-mono">Loading stats…</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Workspaces" value={data?.totalWorkspaces ?? 0} />
            <StatCard label="Documents" value={data?.totalDocuments ?? 0} />
            <StatCard label="Questions Asked" value={data?.totalQuestions ?? 0} />
            <StatCard label="Avg Response" value={`${data?.avgResponseTimeMs ?? 0} ms`} />
          </div>
        )}
      </main>
    </div>
  );
}
