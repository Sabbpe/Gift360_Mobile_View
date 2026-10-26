export interface StoryReelConfig {
  badgeText: string;
  title: string;
  description: string;
  rewardCoins: number;
  brandHandle: string;
  steps: string[];
  sampleReelUrl: string;
  verificationNotice: string;
}

export const STORY_REEL_CAMPAIGN: StoryReelConfig = {
  badgeText: "Story & Reel",
  title: "Share Your Story, Earn 100 SuperCoins",
  description: "Grab any voucher on Gift360, share your experience on Instagram, tag @gift360.io, and drop your link below to claim your reward.",
  rewardCoins: 100,
  brandHandle: "@gift360.io",
  steps: [
    "Purchase any voucher on Gift360",
    "Post a Reel or Story on Instagram & tag @gift360.io",
    "Paste your live link below and tap Claim"
  ],
  sampleReelUrl: "https://www.instagram.com/reels/De6jKsSvBQB/",
  verificationNotice: "SuperCoins are credited automatically after our automated verification confirms your reel or story is live.",
};
