import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { CommentSection } from "@/components/detail/comment-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getShoeBySlug, getShoes } from "@/lib/data/shoes";

export default async function ShoeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shoe = await getShoeBySlug(slug);
  if (!shoe) return notFound();
  const related = (await getShoes()).filter((s) => s.brand === shoe.brand && s.id !== shoe.id).slice(0, 3);
  const storyTitle = shoe.story?.title?.trim();
  const storyContent = shoe.story?.content?.trim();
  const hasStory = Boolean(storyTitle || storyContent);

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
        <Card className="p-5"><h2 className="text-lg font-semibold">Performance profile</h2><dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><dt className="soft-text">Cushioning</dt><dd>{shoe.spec.cushioning_feel ?? "Not yet added"}</dd></div><div className="flex justify-between"><dt className="soft-text">Court feel</dt><dd>{shoe.spec.court_feel ?? "Not yet added"}</dd></div><div className="flex justify-between"><dt className="soft-text">Bounce</dt><dd>{shoe.spec.bounce ?? "Not yet added"}</dd></div><div className="flex justify-between"><dt className="soft-text">Stability</dt><dd>{shoe.spec.stability ?? "Not yet added"}</dd></div><div className="flex justify-between"><dt className="soft-text">Traction</dt><dd>{shoe.spec.traction ?? "Not yet added"}</dd></div><div className="flex justify-between"><dt className="soft-text">Fit</dt><dd>{shoe.spec.fit ?? "Not yet added"}</dd></div></dl></Card>
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
