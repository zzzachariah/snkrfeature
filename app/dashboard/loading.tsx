import { BrandLoader } from "@/components/ui/brand-loader";

export default function DashboardLoading() {
  return (
    <main className="container-shell py-8">
      <div className="grid gap-4 lg:grid-cols-[240px,1fr]">
        <div className="surface-card premium-border rounded-2xl p-4">
          <BrandLoader label="Loading dashboard" compact />
        </div>
        <div className="space-y-4">
          <div className="skeleton h-28 rounded-2xl" />
          <div className="skeleton h-28 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </div>
    </main>
  );
}
