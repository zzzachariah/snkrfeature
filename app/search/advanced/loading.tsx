import { BrandLoader } from "@/components/ui/brand-loader";

export default function AdvancedSearchLoading() {
  return (
    <main className="container-shell space-y-4 py-8">
      <div className="surface-card premium-border rounded-3xl p-6">
        <BrandLoader label="Loading advanced search" compact />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="skeleton h-20 rounded-xl" />
        <div className="skeleton h-20 rounded-xl" />
        <div className="skeleton h-20 rounded-xl" />
      </div>
      <div className="skeleton h-64 rounded-2xl" />
    </main>
  );
}
