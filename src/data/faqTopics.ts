// FAQ answers shared with Sahil, the support chatbot. Sahil's replies link to /faq/<id>.
// Keep in sync with gift360_rag/kb/faq.json (verified entries).
export interface FaqTopic { id: string; title: string; answer: string; category: string }

/** Live SuperCoin rules from GET /v1/support/facts/supercoin (database-backed). */
export interface ScFacts { coinsPerRupee: string; coins100?: number; minAmount?: number; maxAmount?: number; capPercentRegularVouchers?: number }

/** Replaces {{tokens}} with live values. Any line that still needs a missing value is dropped, so a stale number is never shown. */
export function fillFacts(text: string, f: ScFacts | null): string {
  const vals: Record<string, string | undefined> = f ? {
    coinsPerRupee: f.coinsPerRupee,
    coins100: String(Math.ceil(100 * Number(f.coinsPerRupee))),
    coins500: String(Math.ceil(500 * Number(f.coinsPerRupee))),
    minAmount: f.minAmount != null ? String(f.minAmount) : undefined,
    maxAmount: f.maxAmount != null ? Number(f.maxAmount).toLocaleString("en-IN") : undefined,
  } : {};
  return text.split("\n").map((line) => {
    let missing = false;
    const out = line.replace(/\{\{(\w+)\}\}/g, (_, k) => { const v = vals[k]; if (v === undefined) missing = true; return v ?? ""; });
    return missing ? null : out;
  }).filter((l): l is string => l !== null).join("\n").replace(/\s+(?=\.)/g, "");
}
export const FAQ_TOPICS: FaqTopic[] = [
  {
    "id": "supercoin-how-to-use",
    "title": "How do I use my Flipkart SuperCoins on Gift360?",
    "answer": "You can use your Flipkart SuperCoins on Gift360 in two ways:\n1) Pick any voucher, add it to your cart and choose the SuperCoins option. It shows how many coins will be used.\n2) To turn SuperCoins into a SuperCoin E-Gift Voucher, use the 'Try Now' section at the top of the home page.\nThe app will show you the exact coins needed before you pay.",
    "category": "supercoins"
  },
  {
    "id": "supercoin-rate",
    "title": "How many SuperCoins does a voucher cost?",
    "answer": "Every ₹1 of a SuperCoin voucher costs {{coinsPerRupee}} SuperCoins.\nSo a ₹100 voucher uses {{coins100}} SuperCoins and a ₹500 voucher uses {{coins500}}.\nYou'll see the exact number at checkout before you confirm.",
    "category": "supercoins"
  },
  {
    "id": "supercoin-voucher-range",
    "title": "Which SuperCoin voucher amounts are available?",
    "answer": "The SuperCoin E-Gift Voucher is available from ₹{{minAmount}} up to ₹{{maxAmount}}.\nFind it under 'Try Now' on the home page.",
    "category": "supercoins"
  },
  {
    "id": "supercoin-voucher-redeem",
    "title": "How do I redeem my SuperCoin voucher?",
    "answer": "Once your SuperCoin voucher is issued, open it from My Orders and tap 'Use Myself' to see the code. Then redeem it on the Flipkart SuperCoin claim page: https://flipkartsupercoin.woohoo.in/claimReward and follow the steps there.",
    "category": "supercoins"
  },
  {
    "id": "voucher-code-location",
    "title": "Where do I find my voucher code?",
    "answer": "Open My Orders in your Gift360 account, choose the order and tap 'Use Myself'. Your voucher code and PIN are shown there.",
    "category": "orders"
  },
  {
    "id": "what-is-gift360",
    "title": "What is Gift360?",
    "answer": "Gift360 is a digital gift voucher marketplace. Choose a brand and amount, pay, and your voucher is delivered instantly in My Orders. You can pay with SuperCoins at the cart, and earn SuperCoins on purchases. Use it at gift360.io or from the SuperCoin Partners page inside the Flipkart app.",
    "category": "general"
  }
,
  {"id": "supercoin-how-many", "title": "How many SuperCoins do I need for a ₹500 voucher?", "answer": "At the current rate of {{coinsPerRupee}} SuperCoins per ₹1, a ₹500 voucher uses {{coins500}} SuperCoins and a ₹100 voucher uses {{coins100}}.\nThe exact number is always shown in your cart before you pay.", "category": "supercoins"},
  {"id": "supercoin-see-before-pay", "title": "Will I see the SuperCoins needed before I pay?", "answer": "Yes. Add the voucher to your cart and choose the SuperCoins option. The app shows exactly how many coins will be used before you confirm.", "category": "supercoins"}
  ,{"id":"gift-a-voucher","title":"Can I gift a voucher to someone?","answer":"Yes. Once your voucher is issued, open it in My Orders and choose Gift to send it to someone by WhatsApp or email. If the person hasn't received it, share the order number and we'll check.","category":"vouchers"},
  {"id":"supercoin-flipkart-app","title":"How do I open Gift360 from the Flipkart app?","answer":"In the Flipkart app, open the SuperCoin Partners page and choose Gift360. You can also go straight to gift360.io.","category":"supercoins"}
];
