export interface BrandDetailsApiResponse {
  brandCode: string;
  brandId: string;
  brandName: string;
  brandType: string;
  category: string;
  description: string;
  discount: string;
  images: string | null;
  denominationList: string | string[];
  importantInstruction: string | null;
  redeemSteps: string;
  tnc: string | null;
  minPrice: string;
  maxPrice: string;
  stockAvailable: string;
  createdAt: string | null;
  updatedAt: string | null;
  supercoinBurnRatio?: number | string | null;
  redemptionSurchargePercent?: number | string | null;
  earnPercentSpecialSku?: number | string | null;
}

export interface BrandDetailsParsed {
  BrandCode: string;
  BrandId: string;
  BrandName: string;
  BrandType: string;
  Category: string;
  Description: string;

  Discount: number;
  minPrice: number;
  maxPrice: number;

  StockAvailable: number;

  Images: {
    text?: string,
    thumbnail?: string;
    featured?: string;
    mobile?: string;
    base?: string;
    small?: string;
    raw?: string;
  } | null;

  ImageUrl?: string | null;

  DenominationList: number[];

  ImportantInstruction: Record<string, string>;
  RedeemSteps: Array<{ title: string; image?: string; description?: string }>;
  Tnc: Record<string, string> | string;

  CreatedAt: string | null;
  UpdatedAt: string | null;

  // SuperCoin conversion knobs from the brand's catalog row (V41 migration).
  // null for every brand except the SuperCoin E-Gift Voucher; callers must
  // fall back to the global values from GET /v1/supercoin/config when null.
  SupercoinBurnRatio: number | null;
  RedemptionSurchargePercent: number | null;
  EarnPercentSpecialSku: number | null;
}
