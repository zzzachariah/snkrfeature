import { SneakerLoader } from "@/components/ui/sneaker-loader";

export default function AdvancedSearchLoading() {
  return (
    <main className="container-shell py-16">
      <div className="surface-card premium-border rounded-3xl p-10 flex items-center justify-center min-h-[320px]">
        <SneakerLoader label="Loading advanced search" />
      </div>
    </main>
  );
}
