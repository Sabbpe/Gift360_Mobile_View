import { brandApi } from "@/lib/valuedesignApi";
import type { FilterRequestBody } from "@/types/filter";
import type { BrandImages } from "@/types/brand";

function parseImages(imageData?: string | null): BrandImages | null {
  if (!imageData) return null;

  try {
    const parsed = JSON.parse(imageData);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return {
      featured: imageData,
      thumbnail: imageData,
      mobile: imageData,
      raw: imageData,
    };
  }
}

export const filterBrands = async (
  body: FilterRequestBody
): Promise<any[]> => {
  const res = await brandApi.post(
    "/brands/filter",
    body
  );

  const rawItems: any[] = Array.isArray(res.data)
    ? res.data
    : (res.data as any)?.data || (res.data as any)?.brands || (res.data as any)?.result || [];

  return rawItems.map((item: any) => {
    const resolvedId = item.brandId || item.brand_id || item.BrandId || item.id;
    const resolvedName = item.brandName || item.BrandName || item.brand_name;
    return {
      ...item,
      BrandId: resolvedId,
      brandId: resolvedId,
      BrandName: resolvedName,
      brandName: resolvedName,
      Category: item.category || item.Category || "",
      Images: parseImages(item.brand_image_url || item.image || item.images || item.Image || null),
      minPrice: Number(item.minPrice ?? item.min_price ?? 0),
      maxPrice: Number(item.maxPrice ?? item.max_price ?? 0),
      Discount: item.cashback?.toString() || item.discount?.toString() || item.Discount || undefined,
    };
  });
};
