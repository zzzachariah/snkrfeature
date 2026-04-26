export function proxiedImageSrc(src: string | null | undefined): string {
  if (!src) return "";
  const trimmed = src.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return trimmed;
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return trimmed;
  if (!/^https?:\/\//i.test(trimmed)) return trimmed;
  return `/api/image-proxy?url=${encodeURIComponent(trimmed)}`;
}
