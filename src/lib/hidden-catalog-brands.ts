// SKUs that must never show up in the public catalog surfaces (home search
// suggestions, search results, category listings). These brands are only
// reachable through their dedicated flows (e.g. the SuperCoin convert modal).
//
// Matching happens on BrandCode, BrandId and BrandName because the list
// endpoints (/brands/getallnames, /brands/search, /brands/getall) only return
// ids/names -- the code is kept here so the SKU is documented in one place.

export const HIDDEN_CATALOG_BRAND_CODES = ["EGCGBFKSCR001"];

export const HIDDEN_CATALOG_BRAND_IDS = [
  "c1ae829e-0e78-4dfe-8432-c4c1ac9360e1", // EGCGBFKSCR001 - SuperCoin E-Gift Voucher
];

export const HIDDEN_CATALOG_BRAND_NAMES = ["SuperCoin E-Gift Voucher"];

function normalizeName(value?: string | number | null): string {
  return (value == null ? "" : String(value)).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isHiddenCatalogBrand(
  brandId?: string | number | null,
  brandName?: string | null,
  brandCode?: string | null
): boolean {
  const resolvedId = (brandId == null ? "" : String(brandId)).trim().toLowerCase();
  if (resolvedId && HIDDEN_CATALOG_BRAND_IDS.some((id) => id.toLowerCase() === resolvedId)) {
    return true;
  }

  const resolvedCode = (brandCode == null ? "" : String(brandCode)).trim().toUpperCase();
  if (resolvedCode && HIDDEN_CATALOG_BRAND_CODES.includes(resolvedCode)) {
    return true;
  }

  const resolvedName = normalizeName(brandName);
  if (resolvedName && HIDDEN_CATALOG_BRAND_NAMES.some((name) => normalizeName(name) === resolvedName)) {
    return true;
  }

  return false;
}
