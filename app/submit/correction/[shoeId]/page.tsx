import { notFound } from "next/navigation";
import { SubmissionForm } from "@/components/submit/submission-form";
import { getShoes } from "@/lib/data/shoes";

export default async function SubmitCorrectionPage({ params }: { params: Promise<{ shoeId: string }> }) {
  const { shoeId } = await params;
  const shoe = (await getShoes()).find((row) => row.id === shoeId);
  if (!shoe) return notFound();

  const initialValues = {
    shoe_name: shoe.shoe_name ?? "",
    brand: shoe.brand ?? "",
    model: [shoe.model_line, shoe.version_name].filter(Boolean).join(" ").trim(),
    release_year: shoe.release_year ?? "",
    forefoot_midsole_tech: shoe.spec.forefoot_midsole_tech ?? "",
    heel_midsole_tech: shoe.spec.heel_midsole_tech ?? "",
    outsole_tech: shoe.spec.outsole_tech ?? "",
    upper_tech: shoe.spec.upper_tech ?? "",
    cushioning_feel: shoe.spec.cushioning_feel ?? "",
    court_feel: shoe.spec.court_feel ?? "",
    bounce: shoe.spec.bounce ?? "",
    stability: shoe.spec.stability ?? "",
    traction: shoe.spec.traction ?? "",
    fit: shoe.spec.fit ?? "",
    tags: (shoe.spec.tags ?? []).join(", "),
    source_links: shoe.story?.source_url ?? "",
    story_title: shoe.story?.title ?? "",
    story_notes: shoe.story?.content ?? shoe.spec.story_summary ?? "",
    raw_text: ""
  };

  const originalSnapshot = {
    shoe,
    captured_at: new Date().toISOString()
  };

  return (
    <SubmissionForm
      mode="correction"
      targetShoeId={shoe.id}
      targetShoeLabel={`${shoe.brand} ${shoe.shoe_name}`}
      initialValues={initialValues}
      originalSnapshot={originalSnapshot}
    />
  );
}
