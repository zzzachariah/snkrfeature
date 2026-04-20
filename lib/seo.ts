export const SITE_URL = "https://snkrfeature.com";
export const DEFAULT_OG_IMAGE_URL = `${SITE_URL}/icon.ico`;
export const SITE_NAME = "SNKR Feature";

export const HOME_TITLE = "SNKR Feature | Data-driven basketball shoe specs & comparisons";
export const HOME_DESCRIPTION = "EVERYTHING u need to know for sneakers";

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
