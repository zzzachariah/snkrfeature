"use client";

import Link from "next/link";
import { Activity, ArrowRight, Building2, Database } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/i18n/locale-provider";

export function HomeHero({ shoesCount, brandsCount }: { shoesCount: number; brandsCount: number }) {
  const { translate } = useLocale();

  return (
    <section className="grid items-stretch gap-4 lg:grid-cols-[1.35fr_0.9fr]">
      <div className="surface-card premium-border rounded-3xl p-7 md:p-8">
        <p className="text-xs uppercase tracking-[0.2em] soft-text">{translate("Integrated Basketball Sneaker Feature Platform")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[0.02em] md:text-4xl">{translate("Compare, discuss, and choose your ideal basketball sneaker on SNKRFEATURE")}</h1>
        <p className="mt-3 max-w-2xl soft-text">{translate("If you want to contribute to our community, please submit corrections, upload a new shoe, and discuss!")}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/submit"><Button>{translate("Submit new shoe info")}</Button></Link>
          <Link href="/compare"><Button variant="ghost" className="inline-flex items-center gap-1">{translate("Open compare")} <ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
      </div>

      <div className="grid gap-3">
        <Card className="p-5"><Database className="mb-2 h-5 w-5 text-[rgb(var(--accent))]" /><p className="text-2xl font-semibold">{shoesCount}</p><p className="soft-text">{translate("Shoes indexed")}</p></Card>
        <Card className="p-5"><Building2 className="mb-2 h-5 w-5 text-[rgb(var(--accent))]" /><p className="text-2xl font-semibold">{brandsCount}</p><p className="soft-text">{translate("Brands represented")}</p></Card>
        <Card className="p-5"><Activity className="mb-2 h-5 w-5 text-[rgb(var(--accent))]" /><p className="text-2xl font-semibold">{translate("Live")}</p><p className="soft-text">{translate("Submission review pipeline")}</p></Card>
      </div>
    </section>
  );
}
