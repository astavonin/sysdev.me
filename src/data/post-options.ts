import { languages, translate, type Language } from "../i18n";
export const categoryNames = [
  "tooling",
  "cpp",
  "ai",
  "go",
  "rust",
  "industry-analysis",
  "books-and-articles",
  "python",
  "gstreamer",
  "git",
] as const;
export type Category = (typeof categoryNames)[number];
export const categoryLabel = (lang: Language, category: string) =>
  categoryNames.includes(category as Category)
    ? translate(lang, `category.${category as Category}`)
    : category;
// Accept category IDs or a localized label in any language.
export function normalizeCategory(value: string): string {
  return (
    categoryNames.find((category) =>
      languages.some((lang) => categoryLabel(lang, category) === value),
    ) ?? value
  );
}

// Sidebar icon per category. Literal class strings so Tailwind's scanner emits
// the CSS; anything unmapped falls back to a generic folder.
export const categoryIcons: Record<Category, string> = {
  tooling: "icon-[lucide--wrench]",
  cpp: "icon-[simple-icons--cplusplus]",
  ai: "icon-[lucide--brain]",
  go: "icon-[simple-icons--go]",
  rust: "icon-[simple-icons--rust]",
  "industry-analysis": "icon-[lucide--trending-up]",
  "books-and-articles": "icon-[lucide--book-open]",
  python: "icon-[simple-icons--python]",
  gstreamer: "icon-[lucide--audio-waveform]",
  git: "icon-[simple-icons--git]",
};
// Every Category has an entry by type, so the fallback only covers a value
// that bypassed the schema.
export const categoryIcon = (category: string) =>
  categoryIcons[category as Category] ?? "icon-[lucide--folder]";
