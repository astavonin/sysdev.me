/**
 * Pure helpers behind the /YYYY/MM/DD/<slug>/ scheme.
 *
 * Separate from posts.ts so they can be unit-tested without astro:content,
 * and so the extracted getStaticPaths chunk can import them — a helper defined
 * in component frontmatter is not in scope there.
 */

/** UTC so a date-only value never shifts a day in a non-UTC timezone. */
export function datePath(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "/");
}

/** Route params for the date segments. */
export function dateParams(date: Date) {
  const [year, month, day] = datePath(date).split("/");
  return { year, month, day };
}

/** Shared by the content schema and its test, so the two cannot diverge. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-{1,2}[a-z0-9]+)*$/;

export function permalink(date: Date, slug: string): string {
  return `/${datePath(date)}/${slug}/`;
}

/**
 * Prose word count. Fences, HTML and image URLs are not prose: counting them
 * inflated both the reading estimate and the wordCount published in JSON-LD.
 */
export function countWords(body: string): number {
  const prose = body
    .replace(/^~{3,}[\s\S]*?^~{3,}/gm, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    // Images carry no prose; ordinary links keep their anchor text.
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  return prose.trim().split(/\s+/).filter(Boolean).length;
}
