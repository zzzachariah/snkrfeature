import Link from "next/link";
import { Activity, Building2, Database, ArrowRight } from "lucide-react";
import { HomeTable } from "@/components/home/home-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getShoes } from "@/lib/data/shoes";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/locales";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const shoes = await getShoes();
  const brands = new Set(shoes.map((s) => s.brand)).size;
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <main className="container-shell space-y-8 py-8">
      <section className="grid items-stretch gap-4 lg:grid-cols-[1.35fr_0.9fr]">
        <div className="surface-card premium-border rounded-3xl p-7 md:p-8">
          <p className="text-xs uppercase tracking-[0.2em] soft-text">{t.home.heroKicker}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[0.02em] md:text-4xl">{t.home.heroTitle}</h1>
          <p className="mt-3 max-w-2xl soft-text">{t.home.heroDesc}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/submit"><Button>{t.home.submitNew}</Button></Link>
            <Link href="/compare"><Button variant="ghost" className="inline-flex items-center gap-1">{t.home.openCompare} <ArrowRight className="h-4 w-4" /></Button></Link>
          </div>
        </div>

        <div className="grid gap-3">
          <Card className="p-5"><Database className="mb-2 h-5 w-5 text-[rgb(var(--accent))]" /><p className="text-2xl font-semibold">{shoes.length}</p><p className="soft-text">{t.home.shoesIndexed}</p></Card>
          <Card className="p-5"><Building2 className="mb-2 h-5 w-5 text-[rgb(var(--accent))]" /><p className="text-2xl font-semibold">{brands}</p><p className="soft-text">{t.home.brandsRepresented}</p></Card>
          <Card className="p-5"><Activity className="mb-2 h-5 w-5 text-[rgb(var(--accent))]" /><p className="text-2xl font-semibold">Live</p><p className="soft-text">{t.home.pipeline}</p></Card>
        </div>
      </section>

      <HomeTable shoes={shoes} initialQuery={q ?? ""} locale={locale} />
    </main>
  );
}
