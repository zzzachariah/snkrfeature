import { BrandLoader } from "@/components/ui/brand-loader";

export default function Loading() {
  return (
    <main className="container-shell space-y-5 py-10">
      <div className="surface-card premium-border rounded-3xl p-8">
        <BrandLoader label="Loading" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="skeleton h-28 rounded-2xl" />
        <div className="skeleton h-28 rounded-2xl" />
        <div className="skeleton h-28 rounded-2xl" />
      </div>
      <div className="skeleton h-72 rounded-2xl" />
    </main>
  );
}
