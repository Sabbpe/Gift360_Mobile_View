// Cart data — brand names as they appear in the orders/abandoned_cart table
// BrandId is NOT hardcoded here. It's resolved at runtime by matching
// these names against the fetchbrands API response.
export interface CartBrandEntry {
  displayName: string;
  recentPurchases: number;
  cartValue: number;
  lastPurchasedLabel: string;
}

// Sorted by recency (hours_since_update ascending in original data)
export const cartBrandNames: CartBrandEntry[] = [
  { displayName: "AJIO E-Gift Card", recentPurchases: 1200, cartValue: 21297, lastPurchasedLabel: "1h ago" },
  { displayName: "Bigbasket E-Gift Card", recentPurchases: 2400, cartValue: 34600, lastPurchasedLabel: "3h ago" },
  { displayName: "Blinkit E-Gift Card", recentPurchases: 1800, cartValue: 19980, lastPurchasedLabel: "5h ago" },
  { displayName: "Nykaa", recentPurchases: 1500, cartValue: 5000, lastPurchasedLabel: "7h ago" },
  { displayName: "Lenskart Gift Card", recentPurchases: 1100, cartValue: 3000, lastPurchasedLabel: "6h ago" },
  { displayName: "Croma", recentPurchases: 3200, cartValue: 5000, lastPurchasedLabel: "38h ago" },
  { displayName: "Dominos Pizza", recentPurchases: 2800, cartValue: 2000, lastPurchasedLabel: "22h ago" },
  { displayName: "Westside E-Gift Card", recentPurchases: 1300, cartValue: 4167, lastPurchasedLabel: "69h ago" },
  { displayName: "TATA CLiQ", recentPurchases: 1900, cartValue: 5000, lastPurchasedLabel: "62h ago" },
  { displayName: "Uber E-Gift Card", recentPurchases: 1400, cartValue: 4126, lastPurchasedLabel: "61h ago" },
  { displayName: "Zomato E-Gift Card", recentPurchases: 2100, cartValue: 4025, lastPurchasedLabel: "88h ago" },
  { displayName: "BookMyShow Instant Voucher", recentPurchases: 1600, cartValue: 1500, lastPurchasedLabel: "55h ago" },
  { displayName: "PVR Cinemas E-Gift Card", recentPurchases: 1100, cartValue: 2043, lastPurchasedLabel: "46h ago" },
  { displayName: "Bata", recentPurchases: 2600, cartValue: 2000, lastPurchasedLabel: "36h ago" },
  { displayName: "Apollo", recentPurchases: 1700, cartValue: 1500, lastPurchasedLabel: "49h ago" },
  { displayName: "BlueStone Gold Jewellery", recentPurchases: 1050, cartValue: 5000, lastPurchasedLabel: "26h ago" },
  { displayName: "FirstCry E-Gift Voucher", recentPurchases: 1350, cartValue: 1314, lastPurchasedLabel: "80h ago" },
  { displayName: "American Tourister", recentPurchases: 1150, cartValue: 2000, lastPurchasedLabel: "22h ago" },
];
