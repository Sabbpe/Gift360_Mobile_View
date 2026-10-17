import { brandApi } from "@/lib/valuedesignApi";
import type { BrandDetailsApiResponse, BrandDetailsParsed } from "@/types/brandDetails";

export const getBrandDetails = async (brandId: string): Promise<BrandDetailsParsed> => {
  console.log("🔥 BrandDetails API CALLED with brandId =", brandId);

  const res = await brandApi.post<BrandDetailsApiResponse>(
    `/brands/${brandId}`,
    {}
  )

  const b = res.data;
  console.log("🔥 Raw Brand API Response =", b);

  // Normalize images: accept `images` (JSON), `image` (string/JSON) or `brand_image_url` (string)
  const parseBrandImages = (imageData: any) => {
    if (!imageData) return null;
    if (typeof imageData === "object") return imageData;
    try {
      const parsed = JSON.parse(imageData);
      return typeof parsed === "object" && parsed !== null ? parsed : null;
    } catch {
      // treat plain string as raw URL -> map to common keys
      return {
        featured: imageData,
        thumbnail: imageData,
        mobile: imageData,
        raw: imageData,
        base: imageData,
        small: imageData,
        text: imageData,
      };
    }
  };

  const parsedImages = parseBrandImages((b as any).images || null);

  // Determine a single image URL using the same priority as fetchbrands
  let imageUrl: string | null = null;
  if (parsedImages) {
    imageUrl =
      parsedImages.featured ||
      parsedImages.thumbnail ||
      parsedImages.mobile ||
      parsedImages.raw ||
      parsedImages.base ||
      parsedImages.small ||
      parsedImages.text ||
      null;
  }

  // Parse instructions
  let parsedInstructions: Record<string, string> = {};
  if (b.importantInstruction) {
    try {
      parsedInstructions = JSON.parse(b.importantInstruction);
    } catch {
      parsedInstructions = {};
    }
  }

  // Parse redeem steps
  let parsedRedeemSteps: Array<{ title: string; image?: string }> = [];
  try {
    parsedRedeemSteps = JSON.parse(b.redeemSteps);
  } catch {
    parsedRedeemSteps = [];
  }

  // Parse T&C
  let parsedTnc: Record<string, string> | string = "";
  if (b.tnc) {
    try {
      parsedTnc = JSON.parse(b.tnc);
    } catch {
      parsedTnc = b.tnc;
    }
  }

  // SuperCoin conversion knobs (nullable -- only the SuperCoin E-Gift
  // Voucher brand carries them). The backend serializes BigDecimal/Integer as
  // JSON numbers, but tolerate strings and drop anything non-numeric so a
  // malformed row can't produce NaN downstream.
  const parseOptionalNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    BrandCode: b.brandCode,
    BrandId: b.brandId,
    BrandName: b.brandName,
    BrandType: b.brandType,
    Category: b.category,
    Description: b.description,

    Discount: Number(b.discount) || 0,
    minPrice: Number(b.minPrice) || 0,
    maxPrice: Number(b.maxPrice) || 0,

    StockAvailable: Number(b.stockAvailable) || 0,

    Images: parsedImages,

    ImageUrl: imageUrl,

    DenominationList:
      typeof b.denominationList === "string"
        ? b.denominationList.split(",").map((v: string) => Number(v.trim()))
        : Array.isArray(b.denominationList)
        ? b.denominationList.map((v: string) => Number(v))
        : [],

    ImportantInstruction: parsedInstructions,
    RedeemSteps: parsedRedeemSteps,
    Tnc: parsedTnc,

    CreatedAt: b.createdAt || null,
    UpdatedAt: b.updatedAt || null,

    SupercoinBurnRatio: parseOptionalNumber((b as any).supercoinBurnRatio),
    RedemptionSurchargePercent: parseOptionalNumber((b as any).redemptionSurchargePercent),
    EarnPercentSpecialSku: parseOptionalNumber((b as any).earnPercentSpecialSku),
  };
};
