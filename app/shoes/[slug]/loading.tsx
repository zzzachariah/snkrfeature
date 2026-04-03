import { BrandLoader } from "@/components/ui/brand-loader";

export default function ShoeDetailLoading() {
  return (
    <main className="container-shell space-y-4 py-8">
      <div className="surface-card premium-border rounded-3xl p-6">
        <BrandLoader label="Loading shoe detail" compact />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <div className="skeleton h-24 rounded-xl" />
        <div className="skeleton h-24 rounded-xl" />
        <div className="skeleton h-24 rounded-xl" />
        <div className="skeleton h-24 rounded-xl" />
      </div>
      <div className="skeleton h-[320px] rounded-2xl" />
    </main>
  );
}
