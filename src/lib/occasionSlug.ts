// Shared between the Home occasion sections (anchor id) and the Instant
// Gifting "Offers for every occasion" slide (scroll target), so a long or
// punctuated occasion string ("Diwali - 2026") maps to the same id on both.
export const occasionSlug = (occasion: string): string =>
  occasion
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
