import type { Brand, BrandApiResponse, BrandImages } from "@/types/brand";
import { brandApi } from "@/lib/valuedesignApi";

export interface RecommendationBrand {
  brandId: string;
  brandCode: string;
  brandName: string;
  category: string;
  discount: string;
  brandType: string;
  minPrice: number;
  maxPrice: number;
  denominationList: string;
  stockAvailable: string;
  availability: string;
  description: string;
  tnc: string;
  images: string;
  importantInstruction: string;
  redeemSteps: string;
  occasions: string[];
}

export interface RecommendationsResponse {
  operation: string;
  status: string;
  payload: {
    statusCode: number;
    result: RecommendationBrand[];
  };
}

export const fetchRecommendations = async (occasion: string): Promise<Brand[]> => {
  const res = await brandApi.post<any>("/v1/recommendations", { occasion });
  const raw = res.data;

  // Handle: array, {payload:{result}}, {result}, {data:[{...}]}, {data:{result}}
  let result: any[] = [];
  if (Array.isArray(raw)) {
    result = raw;
  } else if (raw?.payload?.result) {
    result = raw.payload.result;
  } else if (raw?.result) {
    result = raw.result;
  } else if (Array.isArray(raw?.data)) {
    result = raw.data;
  } else if (raw?.data?.result) {
    result = raw.data.result;
  }

  return result.map((b: any): Brand => {
    let parsedImages: BrandImages | null = null;
    const imagesRaw = b.images || b.image;

    try {
      if (typeof imagesRaw === "string") {
        const parsed = JSON.parse(imagesRaw);
        parsedImages = typeof parsed === "object" && parsed !== null ? parsed : null;
      } else if (typeof imagesRaw === "object" && imagesRaw !== null) {
        parsedImages = imagesRaw;
      }
    } catch {
      parsedImages = null;
    }

    let minPrice = Number(b.minPrice) || 0;
    let maxPrice = Number(b.maxPrice) || 0;

    if (minPrice === 0 && maxPrice === 0 && b.denominationList) {
      const firstDenom = Number(String(b.denominationList).split(/[,\-]/)[0]) || 0;
      if (firstDenom > 0) minPrice = firstDenom;
    }

    return {
      BrandId: b.brandId || b.BrandId || b.id,
      BrandName: b.brandName || b.BrandName || b.brand_name,
      Category: b.category || b.Category,
      Images: parsedImages,
      Discount: b.discount || b.Discount,
      MinPrice: minPrice,
      MaxPrice: maxPrice,
    };
  });
};

export const getBrands = async (): Promise<Brand[]> => {
  const res = await brandApi.post<BrandApiResponse[]>("/brands/getall");

  console.log("🔥🔥 RAW BRAND LIST API RESPONSE:", res.data);

  return res.data.map((b): Brand => {
    let parsedImages: BrandImages | null = null;

    try {
      parsedImages = b.image ? JSON.parse(b.image) : null;
    } catch {
      parsedImages = null;
    }

    return {
      BrandId: b.brandId,
      BrandName: b.brandName,
      Category: b.category,
      Images: parsedImages,
      Discount: b.discount,
      MinPrice: b.minPrice,
      MaxPrice: b.maxPrice,
    };
  });
};
