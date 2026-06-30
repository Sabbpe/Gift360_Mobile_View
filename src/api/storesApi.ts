import type { NearbyBrand, NearbyBrandsRequest, NearbyBrandsResponse, NearbyStore, NearbyStoreRequest, NearbyStoresResponse, Store, StoreApiResponse } from "@/types/store";
import { brandApi } from "@/lib/valuedesignApi";

function resolveStoreImage(store: any): string | undefined {
  const directImage = store?.image_url || store?.image || store?.store_image || store?.photo || null;
  if (typeof directImage === "string" && directImage.trim()) {
    return directImage;
  }

  const images = store?.images;
  if (typeof images === "string" && images.trim()) {
    try {
      const parsed = JSON.parse(images);
      return parsed.text || parsed.thumbnail || parsed.featured || parsed.base || parsed.raw || undefined;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export const getStores = async (brandId: string): Promise<Store[]> => {
  const res = await brandApi.post<StoreApiResponse[]>(
    `/stores/get/${brandId}`
  );

  console.log("🔥🔥 RAW STORES LIST API RESPONSE:", res.data);

  return res.data.map((s): Store => {
    return {
      StoreId: s.storeId,
      BrandCode: s.brandCode,
      Address: s.address,
      City: s.city,
      State: s.state,
      Country: s.country,
      ContactNumber: s.contactNumber,
      CreatedAt: s.createdAt,
      UpdatedAt: s.updatedAt,
    };
  });
};

export const getNearbyStores = async (
  request: NearbyStoreRequest
): Promise<NearbyStore[]> => {
  const res = await brandApi.post<NearbyStoresResponse>(
    "/v1/stores/nearby",
    request
  );

  console.log("🔥🔥 RAW NEARBY STORES API RESPONSE:", res.data);

  return res.data.stores.map((s): NearbyStore => {
    return {
      storeId: s.store_id,
      address: s.address,
      city: s.city,
      state: s.state,
      country: s.country,
      contactNumber: s.contact_number,
      latitude: s.latitude,
      longitude: s.longitude,
      distanceKm: s.distance_km,
      image: resolveStoreImage(s),
    };
  });
};

export const getNearbyBrands = async (
  request: NearbyBrandsRequest
): Promise<NearbyBrand[]> => {
  const res = await brandApi.post<NearbyBrandsResponse>(
    "/v1/stores/nearby/brands",
    request
  );
  console.log("🔥🔥 RAW NEARBY BRANDS API RESPONSE:", res.data);
  
  return res.data.brands.map((b): NearbyBrand => {
    return {
      brandId: b.brand_id,
      brandCode: b.brand_code,
      brandName: b.brand_name,
      category: b.category,
      brandType: b.brand_type,
      minPrice: b.min_price,
      maxPrice: b.max_price,
      images: b.images ? JSON.parse(b.images) : {},
      nearestDistanceKm: b.nearest_distance_km,
    };
  });
};