import { Shoe } from "@/lib/types";
import { Locale } from "@/lib/i18n/types";
import { isTranslatableField, localizeGlossaryAwareText } from "@/lib/i18n/dynamic-localization";

export function localizeShoeForDisplay(shoe: Shoe, locale: Locale): Shoe {
  if (locale === "en") return shoe;

  const localizedSpec = Object.fromEntries(
    Object.entries(shoe.spec).map(([key, value]) => {
      if (typeof value !== "string") return [key, value];
      if (!isTranslatableField(key)) return [key, value];
      return [key, localizeGlossaryAwareText(value, locale)];
    })
  );

  return {
    ...shoe,
    spec: localizedSpec,
    story: shoe.story
      ? {
          ...shoe.story,
          title: localizeGlossaryAwareText(shoe.story.title, locale),
          content: localizeGlossaryAwareText(shoe.story.content, locale)
        }
      : null
  };
}
