import { cookies } from "next/headers";
import { LOCALE_COOKIE, Locale } from "@/lib/i18n/types";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const cookie = store.get(LOCALE_COOKIE)?.value;
  return cookie === "zh" ? "zh" : "en";
}
