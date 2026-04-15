import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { CommentSection } from "@/components/detail/comment-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PerformanceIndicator } from "@/components/shoe/performance-indicator";
import { getShoeBySlug, getShoes } from "@/lib/data/shoes";
import {
  getBounceScore,
  getCourtFeelScore,
  getCushioningFeelScore,
  getFitScore,
  getPerformanceLabel,
  getStabilityScore,
  getTractionScore
} from "@/lib/shoe-scoring";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/locales";
import { localizeShoeForDisplay } from "@/lib/i18n/localize-shoe";

export default async function ShoeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shoe = await getShoeBySlug(slug);
  if (!shoe) return notFound();
  const locale = await getLocale();
  const t = getDictionary(locale).shoe;
  const displayShoe = localizeShoeForDisplay(shoe, locale);

  const related = (await getShoes()).filter((s) => s.brand === shoe.brand && s.id !== shoe.id).slice(0, 3);
  const storyTitle = displayShoe.story?.title?.trim();
  const storyContent = displayShoe.story?.content?.trim();
  const hasStory = Boolean(storyTitle || storyContent);

  const stabilityText = displayShoe.spec.stability ?? "";
  const tractionText = displayShoe.spec.traction ?? "";
  const fitText = displayShoe.spec.fit ?? "";
  const cushioningFeelText = displayShoe.spec.cushioning_feel ?? "";
  const courtFeelText = displayShoe.spec.court_feel ?? "";
  const bounceText = displayShoe.spec.bounce ?? "";

  const stabilityScore = getStabilityScore(stabilityText);
  const tractionScore = getTractionScore(tractionText);
  const fitScore = getFitScore(fitText);
  const cushioningFeelScore = getCushioningFeelScore(cushioningFeelText);
  const courtFeelScore = getCourtFeelScore(courtFeelText);
  const bounceScore = getBounceScore(bounceText);

  return (
    <main className="container-shell space-y-6 py-8">
      <section className="surface-card premium-border rounded-3xl p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.2em] soft-text">{displayShoe.brand} • {displayShoe.release_year ?? t.tbd}</p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-[0.015em] text-[rgb(var(--text))] md:text-4xl">{displayShoe.shoe_name}</h1>
            <p className="mt-3 text-sm leading-6 soft-text md:text-base">{displayShoe.spec.playstyle_summary ?? t.noPlaystyle}</p>
            <div className="mt-4 flex flex-wrap gap-2">{(displayShoe.spec.tags ?? []).map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>
          </div>
          <div className="flex gap-2"><Link href={`/compare?ids=${displayShoe.id}`}><Button>{t.addToCompare}</Button></Link><Link href={`/submit/correction/${displayShoe.id}`}><Button variant="secondary">{t.submitCorrection}</Button></Link></div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries({ [t.forefootTech]: displayShoe.spec.forefoot_midsole_tech, [t.heelTech]: displayShoe.spec.heel_midsole_tech, [t.outsoleTech]: displayShoe.spec.outsole_tech, [t.upperTech]: displayShoe.spec.upper_tech }).map(([k, v]) => (
          <Card key={k} className="p-4"><p className="text-xs uppercase tracking-wide soft-text">{k}</p><p className="mt-2 font-medium">{v ?? t.notYetAdded}</p></Card>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">{t.performanceProfile}</h2>
          <div className="mt-3 space-y-2.5">
            <PerformanceIndicator
              label={t.cushioningFeel}
              rawText={displayShoe.spec.cushioning_feel}
              score={cushioningFeelScore}
              tier={getPerformanceLabel(cushioningFeelScore)}
            />
            <PerformanceIndicator
              label={t.courtFeel}
              rawText={displayShoe.spec.court_feel}
              score={courtFeelScore}
              tier={getPerformanceLabel(courtFeelScore)}
            />
            <PerformanceIndicator
              label={t.bounce}
              rawText={displayShoe.spec.bounce}
              score={bounceScore}
              tier={getPerformanceLabel(bounceScore)}
            />
            <PerformanceIndicator
              label={t.stability}
              rawText={displayShoe.spec.stability}
              score={stabilityScore}
              tier={getPerformanceLabel(stabilityScore)}
            />
            <PerformanceIndicator
              label={t.traction}
              rawText={displayShoe.spec.traction}
              score={tractionScore}
              tier={getPerformanceLabel(tractionScore)}
            />
            <PerformanceIndicator
              label={t.fit}
              rawText={displayShoe.spec.fit}
              score={fitScore}
              tier={getPerformanceLabel(fitScore)}
            />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold">{t.storyProvenance}</h2>
          {hasStory ? (
            <div className="mt-2 space-y-2">
              <p className="text-sm font-medium">{storyTitle ?? `${displayShoe.brand} ${displayShoe.shoe_name}`}</p>
              <p className="text-sm soft-text">{storyContent ?? t.noStoryContent}</p>
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm soft-text">{t.noStory}</p>
              <div className="mt-4 rounded-xl border border-[rgb(var(--muted)/0.45)] bg-[rgb(var(--bg-elev)/0.66)] p-3 text-xs soft-text">{t.sourceEvidence}</div>
            </>
          )}
        </Card>
      </section>

      <CommentSection shoeId={displayShoe.id} />

      <Card className="p-5">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{t.relatedShoes}</h2><Link href="/" className="inline-flex items-center gap-1 text-sm soft-text">{t.backToDatabase} <ArrowRight className="h-3 w-3" /></Link></div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">{related.map((item) => <Link key={item.id} href={`/shoes/${item.slug}`} className="rounded-xl border border-[rgb(var(--muted)/0.45)] bg-[rgb(var(--bg-elev)/0.55)] p-3 hover:bg-[rgb(var(--accent)/0.08)]">{item.shoe_name}</Link>)}</div>
      </Card>
    </main>
  );
}
