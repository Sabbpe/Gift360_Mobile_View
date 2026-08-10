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
  return SUPERCOIN_EXCLUDED_BRANDS.some(
    (excluded) => brandName.toLowerCase().includes(excluded.toLowerCase())
  );
}

export function isSuperCoinExcludedById(brandId: string): boolean {
  return SUPERCOIN_EXCLUDED_BRAND_IDS.includes(brandId);
}
