import { BrandLoader } from "@/components/ui/brand-loader";

export default function CompareLoading() {
  return (
    <main className="container-shell space-y-4 py-8">
      <div className="surface-card premium-border rounded-3xl p-6">
        <BrandLoader label="Loading comparison matrix" compact />
      </div>
      <div className="skeleton h-14 rounded-xl" />
      <div className="skeleton h-[380px] rounded-2xl" />
    </main>
  );
}
