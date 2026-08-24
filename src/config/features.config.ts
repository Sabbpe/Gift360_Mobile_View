// config/features.ts
// Add this to your existing config structure

export interface SpinWheelConfig {
  enabled: boolean;
  mode: 'preview' | 'embedded' | 'separate-page';
  placement: 'after-hero' | 'after-hot-deals' | 'before-featured';
  dailySpinLimit: number;
  pointsCost: number;
  maxPrize: number;
  prizes: {
    amount: number;
    probability: number;
  }[];
}

// Add to your main config
export const spinWheelConfig: SpinWheelConfig = {
  enabled: true,
  mode: 'preview', // 'preview' | 'embedded' | 'separate-page'
  placement: 'after-hero', // Where to show on home page
  dailySpinLimit: 1,
  pointsCost: 10,
  maxPrize: 10,
  prizes: [
    { amount: 10, probability: 5 },
    { amount: 5, probability: 15 },
    { amount: 3, probability: 15 },
    { amount: 2, probability: 25 },
    { amount: 1, probability: 40 },
  ]
};

// ── SuperCoin conversion kill switch ────────────────────────────────────────
// Single source of truth for pausing SuperCoin -> voucher conversion when the
// upstream provider is out of stock. Every entry point into the SuperCoins
// flow (header icon on Home, the Hero banner, or any future one) MUST import
// and check this — do not hardcode a local copy of this flag in a component,
// since that's exactly how the Hero.tsx banner ended up bypassing it before.
//
// To re-enable once stock is back: flip `enabled` to false. Nothing else
// needs to change.
export interface SuperCoinConversionConfig {
  paused: boolean;
  pausedMessage: string;
}

export const superCoinConversionConfig: SuperCoinConversionConfig = {
  paused: false,
  pausedMessage:
    "We're stocked out on SuperCoins vouchers right now — check back in 2 days! " +
    "Meanwhile, browse 400+ other brands.",
};
