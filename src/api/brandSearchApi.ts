import type { BrandSearchResult, BrandSearchApiResponse } from "@/types/brandSearch";
import type { Brand, BrandImages } from "@/types/brand";
import type { BrandDetailsParsed } from "@/types/brandDetails";
import { brandApi } from "@/lib/valuedesignApi";
import { AxiosError } from "axios";

export type TopBrandVoucher = {
  brandId: string;
  brandName: string;
  category: string;
  discount: number;
  ImageUrl?: string | null;
  image: {
    raw?: string;
    featured?: string;
    thumbnail?: string;
    mobile?: string;
    base?: string;
    small?: string;
    text?: string;
  } | null;
  minPrice: number;
  maxPrice: number;
};

export const searchBrands = async (query: string): Promise<BrandSearchResult[]> => {
  // Don't make API call if query is empty
  if (!query || query.trim() === "") {
    console.log("🔥🔥 Empty query, returning empty array");
    return [];
  }

  console.log("🔥🔥 SENDING SEARCH REQUEST with query:", query);

  try {
    const res = await brandApi.post<BrandSearchApiResponse[]>(
      "/brands/search",
      { searchText: query.trim() },
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    console.log("🔥🔥 RAW BRAND SEARCH API RESPONSE:", res.data);
    console.log("🔥🔥 Response status:", res.status);
    console.log("🔥🔥 Number of results:", res.data?.length || 0);

    return res.data.map((b): BrandSearchResult => ({
      brandId: b.brandId,
      brandName: b.brandName,
      category: b.category,
      image: b.image,
    }));
  } catch (error) {
    console.error("🔥🔥 SEARCH API ERROR:", error);
    if (error instanceof AxiosError) {
      console.error("🔥🔥 Error response:", error.response?.data);
      console.error("🔥🔥 Error status:", error.response?.status);
    }
    return [];
  }
};

type FetchBrandsApiItem = {
  id?: string;
  brandId?: string;
  brand_id?: string;
  brandName?: string;
  brand_name?: string;
  category?: string;
  cashback?: string | number;
  discount?: string | number;
  brand_image_url?: string | null;
  image?: string | null;
  images?: string | null;
  Image?: string | null;
  minPrice?: number;
  maxPrice?: number;
};

type FetchBrandsApiResponse =
  | FetchBrandsApiItem[]
  | {
      data?: FetchBrandsApiItem[];
      brands?: FetchBrandsApiItem[];
      result?: FetchBrandsApiItem[];
    };

type FetchBrandDetailsApiResponse = {
  brandId?: string;
  brand_id?: string;
  brandCode?: string;
  brand_code?: string;
  brandName?: string;
  brand_name?: string;
  brandType?: string;
  brand_type?: string;
  category?: string;
  description?: string;
  discount?: string | number;
  cashback?: string | number;
  images?: string | null;
  image?: string | null;
  brand_image_url?: string | null;
  denominationList?: string | string[] | number[];
  denomination_list?: string | string[] | number[];
  importantInstruction?: string | Record<string, string> | null;
  important_instruction?: string | Record<string, string> | null;
  redeemSteps?: string | Array<{ title: string; image?: string; description?: string }>;
  redeem_steps?: string | Array<{ title: string; image?: string; description?: string }>;
  tnc?: string | Record<string, string> | null;
  minPrice?: string | number;
  min_price?: string | number;
  maxPrice?: string | number;
  max_price?: string | number;
  stockAvailable?: string | number;
  stock_available?: string | number;
  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
};

type FetchBrandVoucherApiItem = {
  brandId?: string;
  brand_id?: string;
  brandName?: string;
  brand_name?: string;
  category?: string;
  discount?: string | number;
  cashback?: string | number;
  image?:
    | string
    | {
        raw?: string;
        featured?: string;
        thumbnail?: string;
        mobile?: string;
        base?: string;
        small?: string;
        text?: string;
      }
    | null;
  images?: string | null;
  brand_image_url?: string | null;
  minPrice?: string | number;
  min_price?: string | number;
  maxPrice?: string | number;
  max_price?: string | number;
  denominationList?: string | string[] | number[];
  denomination_list?: string | string[] | number[];
};

function parseBrandImages(imageData?: string | null): BrandImages | null {
  if (!imageData) return null;

  try {
    const parsed = JSON.parse(imageData) as BrandImages;
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
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
}

function parseInstructions(
  instructions?: string | Record<string, string> | null
): Record<string, string> {
  if (!instructions) return {};

  if (typeof instructions === "object") {
    return instructions;
  }

  try {
    return JSON.parse(instructions) as Record<string, string>;
  } catch {
    return {};
  }
}

function parseRedeemSteps(
  redeemSteps?:
    | string
    | Array<{ title: string; image?: string; description?: string }>
): Array<{ title: string; image?: string; description?: string }> {
  if (!redeemSteps) return [];

  if (Array.isArray(redeemSteps)) {
    return redeemSteps;
  }

  try {
    const parsed = JSON.parse(redeemSteps) as Array<{
      title: string;
      image?: string;
      description?: string;
    }>;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseTerms(
  tnc?: string | Record<string, string> | null
): Record<string, string> | string {
  if (!tnc) return "";

  if (typeof tnc === "object") {
    return tnc;
  }

  try {
    return JSON.parse(tnc) as Record<string, string>;
  } catch {
    return tnc;
  }
}

function parseDenominations(
  denominationList?: string | string[] | number[]
): number[] {
  if (!denominationList) return [];

  if (Array.isArray(denominationList)) {
    return denominationList.map((value) => Number(value)).filter(Boolean);
  }

  return denominationList
    .split(",")
    .map((value) => Number(value.trim()))
    .filter(Boolean);
}

export const fetchTopBrands = async (occasion?: string): Promise<Brand[]> => {
  const res = await brandApi.post<FetchBrandsApiResponse>(
    "/v1/fetchbrands",
    occasion ? { occasion } : {}
  );

  const responseItems = Array.isArray(res.data)
    ? res.data
    : res.data.data || res.data.brands || res.data.result || [];

  return responseItems
    .filter(Boolean)
    .map((brand): Brand | null => {
      const resolvedBrandId =
        brand.id || brand.brandId || brand.brand_id || brand.brand_name;
      const resolvedBrandName = brand.brandName || brand.brand_name;

      if (!resolvedBrandId || !resolvedBrandName) {
        return null;
      }

      return {
        BrandId: resolvedBrandId,
        BrandName: resolvedBrandName,
        Category: brand.category || "",
        Images: parseBrandImages(
          brand.brand_image_url ||
            (brand as any).imageUrl ||
            brand.image ||
            brand.images ||
            brand.Image
        ),
        Discount:
          brand.cashback?.toString() || brand.discount?.toString() || undefined,
        MinPrice: brand.minPrice,
        MaxPrice: brand.maxPrice,
        Occasions: Array.isArray((brand as any).occasions)
          ? (brand as any).occasions
          : undefined,
      };
    })
    .filter((brand): brand is Brand => Boolean(brand));
};

export const fetchPersonalRecommendations = async (): Promise<Brand[]> => {
  const res = await brandApi.post<FetchBrandsApiResponse>(
    "/v1/personal-recommendations",
    {}
  );

  const responseItems = Array.isArray(res.data)
    ? res.data
    : res.data.data || res.data.brands || res.data.result || [];

  // Data here comes from giftvouchers_public (via get_personal_recommendations),
  // same source as fetchBrandVoucherList -- images arrive as a nested/sometimes
  // double-JSON-encoded object ({ raw: "..." }), not a flat URL string like
  // fetchTopBrands' brands-table source. Reuse that proven unwrap logic instead
  // of parseBrandImages, which only handles flat strings.
  return responseItems
    .filter(Boolean)
    .map((brand): Brand | null => {
      const resolvedBrandId =
        brand.id || brand.brandId || brand.brand_id || brand.brand_name;
      const resolvedBrandName = brand.brandName || brand.brand_name;

      if (!resolvedBrandId || !resolvedBrandName) {
        return null;
      }

      let parsedImage: any = null;
      if (brand.image && typeof brand.image === "object") {
        parsedImage = brand.image;
      } else if (typeof brand.image === "string") {
        parsedImage = parseBrandImages(brand.image);
      } else if (brand.images || brand.brand_image_url) {
        parsedImage = parseBrandImages(brand.images || brand.brand_image_url || null);
      }

      if (parsedImage) {
        const fields = ["raw", "featured", "thumbnail", "mobile", "base", "small", "text"] as const;
        for (const field of fields) {
          const value = parsedImage[field];
          if (typeof value === "string" && (value.startsWith("{") || value.startsWith("["))) {
            try {
              const parsed = JSON.parse(value);
              if (typeof parsed === "object" && parsed !== null) {
                parsedImage[field] = parsed.raw || parsed.featured || parsed.thumbnail || parsed.mobile || parsed.base || parsed.small || parsed.text || value;
              }
            } catch { /* not valid JSON, keep original value */ }
          }
        }
      }

      return {
        BrandId: resolvedBrandId,
        BrandName: resolvedBrandName,
        Category: brand.category || "",
        Images: parsedImage,
        Discount:
          brand.cashback?.toString() || brand.discount?.toString() || undefined,
        MinPrice: brand.minPrice,
        MaxPrice: brand.maxPrice,
        Occasions: Array.isArray((brand as any).occasions)
          ? (brand as any).occasions
          : undefined,
      };
    })
    .filter((brand): brand is Brand => Boolean(brand));
};

export const fetchBrandPaymentDetails = async (
  brandId: string
): Promise<BrandDetailsParsed> => {
  const res = await brandApi.post<FetchBrandDetailsApiResponse>(
    "/v1/fetchbranddetails",
    {
      brand_id: brandId,
    }
  );

  const data = res.data;

  return {
    BrandCode: data.brandCode || data.brand_code || "",
    BrandId: data.brandId || data.brand_id || brandId,
    BrandName: data.brandName || data.brand_name || "",
    BrandType: data.brandType || data.brand_type || "",
    Category: data.category || "",
    Description: data.description || "",
    Discount: Number(data.discount ?? data.cashback) || 0,
    minPrice: Number(data.minPrice ?? data.min_price) || 0,
    maxPrice: Number(data.maxPrice ?? data.max_price) || 0,
    StockAvailable: Number(data.stockAvailable ?? data.stock_available) || 0,
    Images: parseBrandImages(
      data.brand_image_url || data.images || data.image || null
    ),
    DenominationList: parseDenominations(
      data.denominationList || data.denomination_list
    ),
    ImportantInstruction: parseInstructions(
      data.importantInstruction || data.important_instruction
    ),
    RedeemSteps: parseRedeemSteps(data.redeemSteps || data.redeem_steps),
    Tnc: parseTerms(data.tnc),
    CreatedAt: data.createdAt || data.created_at || null,
    UpdatedAt: data.updatedAt || data.updated_at || null,
  };
};

export const fetchBrandVoucherList = async (
  brandId: string
): Promise<TopBrandVoucher[]> => {
  const res = await brandApi.post<FetchBrandVoucherApiItem[] | FetchBrandVoucherApiItem>(
    "/v1/fetchbranddetails",
    {
      brand_id: brandId,
    }
  );

  const items = Array.isArray(res.data) ? res.data : [res.data];

  const getFirstDenom = (dl?: string | string[] | number[] | null): number => {
    if (!dl) return 0;
    const arr = Array.isArray(dl) ? dl : String(dl).split(",");
    const first = arr[0];
    if (!first) return 0;
    const num = typeof first === "string" ? Number(first.trim()) : Number(first);
    if (!isNaN(num)) return num;
    const parts = String(first).split("-");
    return parts.length === 2 ? Number(parts[0]) || 0 : 0;
  };

  const getLastDenom = (dl?: string | string[] | number[] | null): number => {
    if (!dl) return 0;
    const arr = Array.isArray(dl) ? dl : String(dl).split(",");
    const last = arr[arr.length - 1];
    if (!last) return 0;
    const num = typeof last === "string" ? Number(last.trim()) : Number(last);
    if (!isNaN(num)) return num;
    const parts = String(last).split("-");
    return parts.length === 2 ? Number(parts[1]) || 0 : 0;
  };

  const mapped = items.map((item): TopBrandVoucher | null => {
    const resolvedBrandId = item.brandId || item.brand_id || brandId;
    const resolvedBrandName = item.brandName || item.brand_name || "";

    if (!resolvedBrandId || !resolvedBrandName) {
      return null;
    }

    let parsedImage: TopBrandVoucher["image"] = null;

    if (item.image && typeof item.image === "object") {
      parsedImage = item.image;
    } else if (typeof item.image === "string") {
      parsedImage = parseBrandImages(item.image);
    } else if (item.images || item.brand_image_url) {
      parsedImage = parseBrandImages(item.images || item.brand_image_url || null);
    }

    if (parsedImage) {
      const fields = ["raw", "featured", "thumbnail", "mobile", "base", "small", "text"] as const;
      for (const field of fields) {
        const value = parsedImage[field];
        if (typeof value === "string" && (value.startsWith("{") || value.startsWith("["))) {
          try {
            const parsed = JSON.parse(value);
            if (typeof parsed === "object" && parsed !== null) {
              (parsedImage as any)[field] = parsed.raw || parsed.featured || parsed.thumbnail || parsed.mobile || parsed.base || parsed.small || parsed.text || value;
            }
          } catch { /* not valid JSON, keep original value */ }
        }
      }
    }

    const dl = item.denominationList || item.denomination_list;

    return {
      brandId: resolvedBrandId,
      brandName: resolvedBrandName,
      category: item.category || "",
      discount: Number(item.discount ?? item.cashback) || 0,
      image: parsedImage,
      ImageUrl: parsedImage
        ? parsedImage.featured || parsedImage.thumbnail || parsedImage.mobile || parsedImage.raw || parsedImage.base || parsedImage.small || parsedImage.text || null
        : null,
      minPrice: Number(item.minPrice ?? item.min_price) || getFirstDenom(dl) || 0,
      maxPrice: Number(item.maxPrice ?? item.max_price) || getLastDenom(dl) || 0,
    };
  }).filter((item): item is TopBrandVoucher => Boolean(item));

  const needsFallback = mapped.some((v) => !v.minPrice && !v.maxPrice);
  if (needsFallback && mapped.length > 0) {
    const fallbackBrandId = mapped[0].brandId;
    try {
      const fallbackRes = await brandApi.post(`/brands/${fallbackBrandId}`, {});
      const fb = fallbackRes.data;
      const fbDl = fb.denominationList || fb.denomination_list;
      if (fbDl) {
        const firstPrice = getFirstDenom(fbDl);
        const lastPrice = getLastDenom(fbDl);
        if (firstPrice) {
          for (const v of mapped) {
            if (!v.minPrice) v.minPrice = firstPrice;
            if (!v.maxPrice) v.maxPrice = lastPrice || firstPrice;
          }
        }
      }
    } catch { /* fallback failed, keep original values */ }
  }

  return mapped;
};
