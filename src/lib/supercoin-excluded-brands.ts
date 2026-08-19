export const SUPERCOIN_EXCLUDED_BRANDS = [
  "PCJ Gold Jewellery E-Gift Card",
  "Estele",
  "Bhima Jewellers - Coin E-Gift Card",
  "Amazon Prime Lite Edition-Giftbig",
  "Joyalukkas Diamond E-Gift Card",
  "Jos Alukkas Jewellery E-Gift Card",
  "Joyalukkas Gold and Diamond E-Gift Card",
  "Candere Gold Jewellery",
  "Reliance Jewels",
  "PC Chandra Gems Gold Coin E-Gift Card",
  "Tanishq",
  "Candere Diamond Jewellery",
  "PCJ Diamond Jewellery E-Gift Card",
  "BlueStone Gold Jewellery",
  "Giva Jewellery Gold E-Gift Card",
  "Bluestone Gemstone Studded E-Gift Card",
  "Kalyan Gold Coin E-Gift Card",
  "Euphoria Gold Coin E-Gift Card",
  "Joyalukkas Pure Gold E-Gift Card",
  "Giva Jewellery E-Gift Card",
  "PMJ Jewellers",
  "Bhima Jewellers - Jewellery E-Gift Card",
  "Marriott",
  "MakeMyTrip",
  "DPauls",
  "Taj Hotels",
  "Cleartrip",
  "Assembly",
  "IRCTC",
  "EaseMyTrip",
  "Samsonite",
  "tripXOXO",
  "American Tourister",
  "Amazon",
];

const SUPERCOIN_EXCLUDED_BRAND_NAME_ALIASES = [
  "amazonprime",
  "amazonprimelite",
  "amazonprimeliteedition",
  "amazonprimeliteeditiongiftbig",
  "prime",
  "primevideo",
  "marriottbonvoy",
  "marriot",
  "make my trip",
  "makemytrip",
  "mmt",
  "american tourister",
  "americantourister",
  "american touristor",
  "americantouristor",
];

export const SUPERCOIN_EXCLUDED_BRAND_IDS = [
  "2",    // Marriott
  "5",    // MakeMyTrip
  "24",   // DPauls
  "45",   // Taj Hotels
  "49",   // Cleartrip
  "54",   // Assembly
  "123",  // IRCTC
  "189",  // Marriott
  "191",  // EaseMyTrip
  "279",  // Samsonite
  "292",  // tripXOXO
  "296",  // American Tourister
];

export function isSuperCoinExcluded(brandName: string): boolean {
  const normalizedBrandName = brandName.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const rawBrandName = brandName.toLowerCase();

  return (
    SUPERCOIN_EXCLUDED_BRANDS.some((excluded) => {
      const normalizedExcluded = excluded.toLowerCase().replace(/[^a-z0-9]+/g, "");
      return normalizedBrandName.includes(normalizedExcluded) || rawBrandName.includes(excluded.toLowerCase());
    }) ||
    SUPERCOIN_EXCLUDED_BRAND_NAME_ALIASES.some((alias) =>
      normalizedBrandName.includes(alias.replace(/[^a-z0-9]+/g, ""))
    )
  );
}

export function isSuperCoinExcludedById(brandId: string): boolean {
  return SUPERCOIN_EXCLUDED_BRAND_IDS.includes(brandId);
}

export function isSuperCoinEligible(brandId?: string | null, brandName?: string | null): boolean {
  const resolvedId = (brandId || "").trim();
  const resolvedName = (brandName || "").trim();

  if (resolvedId && isSuperCoinExcludedById(resolvedId)) {
    return false;
  }

  if (resolvedName && isSuperCoinExcluded(resolvedName)) {
    return false;
  }

  return true;
}
