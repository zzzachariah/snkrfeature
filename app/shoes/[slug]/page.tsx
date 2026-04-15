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

export default async function ShoeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shoe = await getShoeBySlug(slug);
  if (!shoe) return notFound();

  const related = (await getShoes()).filter((s) => s.brand === shoe.brand && s.id !== shoe.id).slice(0, 3);
  const storyTitle = shoe.story?.title?.trim();
  const storyContent = shoe.story?.content?.trim();
  const hasStory = Boolean(storyTitle || storyContent);

  const stabilityText = shoe.spec.stability ?? "";
  const tractionText = shoe.spec.traction ?? "";
  const fitText = shoe.spec.fit ?? "";
  const cushioningFeelText = shoe.spec.cushioning_feel ?? "";
  const courtFeelText = shoe.spec.court_feel ?? "";
  const bounceText = shoe.spec.bounce ?? "";

  const stabilityScore = getStabilityScore(stabilityText);
  const tractionScore = getTractionScore(tractionText);
  const fitScore = getFitScore(fitText);
  const cushioningFeelScore = getCushioningFeelScore(cushioningFeelText);
  const courtFeelScore = getCourtFeelScore(courtFeelText);
  const bounceScore = getBounceScore(bounceText);

  return (
    <main className="container-shell space-y-6 py-8">
      <section className="surface-card premium-border rounded-3xl p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.2em] soft-text">{shoe.brand} • {shoe.release_year ?? "TBD"}</p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-[0.015em] text-[rgb(var(--text))] md:text-4xl">{shoe.shoe_name}</h1>
            <p className="mt-3 text-sm leading-6 soft-text md:text-base">{shoe.spec.playstyle_summary ?? "No playstyle summary available yet."}</p>
            <div className="mt-4 flex flex-wrap gap-2">{(shoe.spec.tags ?? []).map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>
          </div>
          <div className="flex gap-2"><Link href={`/compare?ids=${shoe.id}`}><Button>Add to compare</Button></Link><Link href={`/submit/correction/${shoe.id}`}><Button variant="secondary">Submit correction</Button></Link></div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries({ "Forefoot tech": shoe.spec.forefoot_midsole_tech, "Heel tech": shoe.spec.heel_midsole_tech, "Outsole tech": shoe.spec.outsole_tech, "Upper tech": shoe.spec.upper_tech }).map(([k, v]) => (
          <Card key={k} className="p-4"><p className="text-xs uppercase tracking-wide soft-text">{k}</p><p className="mt-2 font-medium">{v ?? "Not yet added"}</p></Card>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Performance profile</h2>
          <div className="mt-3 space-y-2.5">
            <PerformanceIndicator
              label="Cushioning Feel"
              rawText={shoe.spec.cushioning_feel}
              score={cushioningFeelScore}
              tier={getPerformanceLabel(cushioningFeelScore)}
            />
            <PerformanceIndicator
              label="Court Feel"
              rawText={shoe.spec.court_feel}
              score={courtFeelScore}
              tier={getPerformanceLabel(courtFeelScore)}
            />
            <PerformanceIndicator
              label="Bounce"
              rawText={shoe.spec.bounce}
              score={bounceScore}
              tier={getPerformanceLabel(bounceScore)}
            />
            <PerformanceIndicator
              label="Stability"
              rawText={shoe.spec.stability}
              score={stabilityScore}
              tier={getPerformanceLabel(stabilityScore)}
            />
            <PerformanceIndicator
              label="Traction"
              rawText={shoe.spec.traction}
              score={tractionScore}
              tier={getPerformanceLabel(tractionScore)}
            />
            <PerformanceIndicator
              label="Fit"
              rawText={shoe.spec.fit}
              score={fitScore}
              tier={getPerformanceLabel(fitScore)}
            />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold">Story & provenance</h2>
          {hasStory ? (
            <div className="mt-2 space-y-2">
              <p className="text-sm font-medium">{storyTitle ?? `${shoe.brand} ${shoe.shoe_name}`}</p>
              <p className="text-sm soft-text">{storyContent ?? "No editorial story content yet."}</p>
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm soft-text">No editorial story yet.</p>
              <div className="mt-4 rounded-xl border border-[rgb(var(--muted)/0.45)] bg-[rgb(var(--bg-elev)/0.66)] p-3 text-xs soft-text">Source/evidence: Seed dataset + community validation pipeline. Admin review required before promotion to official records.</div>
            </>
          )}
        </Card>
      </section>

      <CommentSection shoeId={shoe.id} />

      <Card className="p-5">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Related shoes</h2><Link href="/" className="inline-flex items-center gap-1 text-sm soft-text">Back to database <ArrowRight className="h-3 w-3" /></Link></div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">{related.map((item) => <Link key={item.id} href={`/shoes/${item.slug}`} className="rounded-xl border border-[rgb(var(--muted)/0.45)] bg-[rgb(var(--bg-elev)/0.55)] p-3 hover:bg-[rgb(var(--accent)/0.08)]">{item.shoe_name}</Link>)}</div>
      </Card>
    </main>
  );
}
