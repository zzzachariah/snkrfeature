"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { CommentSection } from "@/components/detail/comment-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { PerformanceIndicator } from "@/components/shoe/performance-indicator";
import { Shoe, ShoeImageRecord } from "@/lib/types";
import {
  getBounceScore,
  getCourtFeelScore,
  getCushioningFeelScore,
  getFitScore,
  getPerformanceLabel,
  getStabilityScore,
  getTractionScore
} from "@/lib/shoe-scoring";
import { useLocale } from "@/components/i18n/locale-provider";
import { DynamicTranslatedText } from "@/components/i18n/dynamic-translated-text";
import { ShoeImage } from "@/components/shoe/shoe-image";

type TechCardConfig = {
  value: string | null | undefined;
  field: string;
};

type ShoeDetailImageState = {
  approved: ShoeImageRecord | null;
  pending: ShoeImageRecord | null;
  latestRejected: ShoeImageRecord | null;
};

export function ShoeDetailClient({
  shoe,
  related,
  isAdmin,
  isLoggedIn,
  imageState
}: {
  shoe: Shoe;
  related: Shoe[];
  isAdmin: boolean;
  isLoggedIn: boolean;
  imageState: ShoeDetailImageState;
}) {
  const { translate } = useLocale();
  const router = useRouter();
  const [imageActionLoading, setImageActionLoading] = useState<"find" | "approve" | "reject" | null>(null);
  const [imageActionError, setImageActionError] = useState<string | null>(null);
  const [imageActionSuccess, setImageActionSuccess] = useState<string | null>(null);

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

  const extraTechCards: Record<string, TechCardConfig> = {
    "Outsole tech": {
      value: shoe.spec.outsole_tech,
      field: "outsole_tech",
    },
    "Upper tech": {
      value: shoe.spec.upper_tech,
      field: "upper_tech",
    },
  };

  const reviewImage = imageState.pending?.public_url ?? imageState.approved?.public_url ?? shoe.image_url;
  const hasPendingImage = Boolean(imageState.pending);

  async function runAdminImageAction(action: "find" | "approve" | "reject") {
    setImageActionLoading(action);
    setImageActionError(null);
    setImageActionSuccess(null);
    try {
      const res = await fetch(`/api/admin/shoes/${shoe.id}/image`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action })
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        const errorText = [json?.error, json?.step ? `step=${json.step}` : null, json?.detail ? `detail=${json.detail}` : null]
          .filter(Boolean)
          .join(" | ");
        throw new Error(errorText || json?.message || translate("Image import failed"));
      }
      setImageActionSuccess(json?.message ?? translate("Image approved"));
      router.refresh();
    } catch (error) {
      setImageActionError(error instanceof Error ? error.message : translate("Image import failed"));
    } finally {
      setImageActionLoading(null);
    }
  }

  return (
    <main className="container-shell space-y-6 py-8">
      {!isLoggedIn ? (
        <div className="flex justify-end">
          <div className="max-w-lg rounded-2xl border border-red-500/50 bg-red-500/15 px-4 py-3 text-sm font-medium text-red-200">
            {translate("Log in or sign up for the full SNKR Feature experience.")}
          </div>
        </div>
      ) : null}
      <section className="surface-card premium-border rounded-3xl p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.2em] soft-text">
          <span data-field-key="brand">{shoe.brand}</span> • {shoe.release_year ?? "TBD"}
        </p>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h1
              data-field-key="shoe_name"
              className="text-3xl font-semibold tracking-[0.015em] text-[rgb(var(--text))] md:text-4xl"
            >
              {shoe.shoe_name}
            </h1>

            {shoe.spec.playstyle_summary ? (
              <DynamicTranslatedText
                as="p"
                className="mt-3 text-sm leading-6 soft-text md:text-base"
                text={shoe.spec.playstyle_summary}
              />
            ) : (
              <p className="mt-3 text-sm leading-6 soft-text md:text-base">
                {translate("No playstyle summary available yet.")}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {(shoe.spec.tags ?? []).map((tag) => (
                <Badge key={tag}>
                  <DynamicTranslatedText as="span" text={tag} contentType="descriptive" />
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Link href={`/compare?ids=${shoe.id}`}>
              <Button>{translate("Add to compare")}</Button>
            </Link>
            <Link href={`/submit/correction/${shoe.id}`}>
              <Button variant="secondary">{translate("Submit correction")}</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="surface-card premium-border flex flex-col items-center gap-4 rounded-3xl p-6 md:p-8">
        <ShoeImage
          src={reviewImage}
          alt={`${shoe.brand} ${shoe.shoe_name}`}
          fallbackLabel={translate("No image")}
          variant="detail"
        />
        <div className="text-center text-sm">
          {hasPendingImage ? (
            <p className="font-medium text-amber-400">{translate("Image pending review")}</p>
          ) : imageState.approved ? (
            <p className="font-medium text-emerald-400">{translate("Image approved")}</p>
          ) : imageState.latestRejected ? (
            <p className="font-medium text-rose-400">{translate("Image rejected")}</p>
          ) : (
            <p className="font-medium soft-text">{translate("No image")}</p>
          )}
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" onClick={() => runAdminImageAction("find")} disabled={imageActionLoading !== null}>
              {imageActionLoading === "find"
                ? translate("Searching images...")
                : hasPendingImage
                  ? translate("Search again")
                  : translate("Find image")}
            </Button>
            {hasPendingImage && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => runAdminImageAction("approve")}
                  disabled={imageActionLoading !== null}
                >
                  {translate("Approve image")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => runAdminImageAction("reject")}
                  disabled={imageActionLoading !== null}
                >
                  {translate("Reject image")}
                </Button>
              </>
            )}
          </div>
        )}

        {imageActionError && <FeedbackMessage message={imageActionError} isError />}
        {imageActionSuccess && <FeedbackMessage message={imageActionSuccess} />}
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide soft-text">前掌中底科技</p>
          {shoe.spec.forefoot_midsole_tech ? (
            <p data-field-key="forefoot_midsole_tech" className="mt-2 font-medium">
              {shoe.spec.forefoot_midsole_tech}
            </p>
          ) : (
            <p data-field-key="forefoot_midsole_tech" className="mt-2 font-medium">
              {translate("Not yet added")}
            </p>
          )}
        </Card>

        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide soft-text">后掌中底科技</p>
          {shoe.spec.heel_midsole_tech ? (
            <p data-field-key="heel_midsole_tech" className="mt-2 font-medium">
              {shoe.spec.heel_midsole_tech}
            </p>
          ) : (
            <p data-field-key="heel_midsole_tech" className="mt-2 font-medium">
              {translate("Not yet added")}
            </p>
          )}
        </Card>

        {Object.entries(extraTechCards).map(([k, data]) => (
          <Card key={k} className="p-4">
            <p className="text-xs uppercase tracking-wide soft-text">{translate(k)}</p>
            {data.value ? (
              <DynamicTranslatedText
                as="p"
                className="mt-2 font-medium"
                text={data.value}
                contentType="technology"
              />
            ) : (
              <p data-field-key={data.field} className="mt-2 font-medium">
                {translate("Not yet added")}
              </p>
            )}
          </Card>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">{translate("Performance profile")}</h2>
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
          <h2 className="text-lg font-semibold">{translate("Story & provenance")}</h2>
          {hasStory ? (
            <div className="mt-2 space-y-2">
              {storyTitle ? (
                <DynamicTranslatedText as="p" className="text-sm font-medium" text={storyTitle} />
              ) : (
                <p data-field-key="shoe_name" className="text-sm font-medium">{`${shoe.brand} ${shoe.shoe_name}`}</p>
              )}

              {storyContent ? (
                <DynamicTranslatedText as="p" className="text-sm soft-text" text={storyContent} />
              ) : (
                <p className="text-sm soft-text">{translate("No editorial story content yet.")}</p>
              )}
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm soft-text">{translate("No editorial story yet.")}</p>
              <div className="mt-4 rounded-xl border border-[rgb(var(--muted)/0.45)] bg-[rgb(var(--bg-elev)/0.66)] p-3 text-xs soft-text">
                {translate(
                  "Source/evidence: Seed dataset + community validation pipeline. Admin review required before promotion to official records."
                )}
              </div>
            </>
          )}
        </Card>
      </section>

      <CommentSection shoeId={shoe.id} />

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{translate("Related shoes")}</h2>
          <Link href="/" className="inline-flex items-center gap-1 text-sm soft-text">
            {translate("Back to database")} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {related.map((item) => (
            <Link
              key={item.id}
              href={`/shoes/${item.slug}`}
              data-field-key="shoe_name"
              className="rounded-xl border border-[rgb(var(--muted)/0.45)] bg-[rgb(var(--bg-elev)/0.55)] p-3 hover:bg-[rgb(var(--accent)/0.08)]"
            >
              {item.shoe_name}
            </Link>
          ))}
        </div>
      </Card>
    </main>
  );
}
