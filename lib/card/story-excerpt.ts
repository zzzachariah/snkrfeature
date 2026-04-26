const SENTENCE_END = /([.!?。！？])/;
const ELLIPSIS = "…";

export function storyExcerpt(content: string | null | undefined, maxSentences = 2, maxChars = 220): string {
  const raw = (content ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return "";

  const sentences: string[] = [];
  let buffer = "";
  for (const char of raw) {
    buffer += char;
    if (SENTENCE_END.test(char)) {
      sentences.push(buffer.trim());
      buffer = "";
      if (sentences.length >= maxSentences) break;
    }
  }
  if (sentences.length === 0) {
    if (buffer.trim()) sentences.push(buffer.trim());
  }

  let excerpt = sentences.join(" ").trim();
  if (excerpt.length > maxChars) {
    excerpt = excerpt.slice(0, maxChars).replace(/[\s,;:。、，；：]+$/u, "");
  }

  if (!excerpt) return "";
  if (excerpt.length < raw.length) {
    if (/[.!?。！？]$/u.test(excerpt)) excerpt = excerpt.slice(0, -1);
    return `${excerpt}${ELLIPSIS}`;
  }
  return excerpt;
}
