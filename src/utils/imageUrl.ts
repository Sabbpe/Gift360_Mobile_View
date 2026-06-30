/**
 * Extracts and normalizes image URLs from various API response formats.
 * Handles:
 * - fetchbrands API: direct `brand_image_url` string
 * - fetchbranddetails API: nested `image.raw` with stringified JSON
 * - ImageUrl field from parsed responses
 * - Images object with multiple format options
 */

export function getImageUrl(item: any): string | null {
  if (!item) return null;

  // Priority 1: Direct ImageUrl (from parsed API response)
  if (item.ImageUrl) {
    return item.ImageUrl;
  }

  // Priority 2: fetchbrands API - brand_image_url (direct string)
  if (item.brand_image_url && typeof item.brand_image_url === "string") {
    return item.brand_image_url;
  }

  // Priority 3: fetchbranddetails API - image.raw (may be stringified JSON)
  if (item.image?.raw) {
    try {
      // image.raw might be stringified JSON like "{\"text\":\"https://...\"}"
      const parsed = typeof item.image.raw === "string" ? JSON.parse(item.image.raw) : item.image.raw;
      if (typeof parsed === "object" && parsed.text) {
        return parsed.text;
      }
      // If parsed is a string, use it directly
      if (typeof parsed === "string") {
        return parsed;
      }
    } catch (error) {
      console.error("Failed to parse image.raw:", error);
    }
  }

  // Priority 4: Normalized Images object (from API parsing)
  if (item.Images && typeof item.Images === "object") {
    const url =
      item.Images.featured ||
      item.Images.thumbnail ||
      item.Images.mobile ||
      item.Images.raw ||
      item.Images.base ||
      item.Images.small ||
      item.Images.text;
    if (url && typeof url === "string") {
      // If url is stringified JSON, parse it
      if (url.startsWith("{")) {
        try {
          const parsed = JSON.parse(url);
          return parsed.text || parsed || null;
        } catch {
          return url;
        }
      }
      return url;
    }
  }

  // Priority 5: image field (might be object or string)
  if (item.image) {
    if (typeof item.image === "string") {
      return item.image;
    }
    if (typeof item.image === "object") {
      const url =
        item.image.featured ||
        item.image.thumbnail ||
        item.image.mobile ||
        item.image.raw ||
        item.image.base ||
        item.image.small ||
        item.image.text;
      if (url && typeof url === "string") {
        if (url.startsWith("{")) {
          try {
            const parsed = JSON.parse(url);
            return parsed.text || parsed || null;
          } catch {
            return url;
          }
        }
        return url;
      }
    }
  }

  // Priority 6: Legacy fields
  if (item.Image || item.images) {
    const img = item.Image || item.images;
    if (typeof img === "string") {
      if (img.startsWith("{")) {
        try {
          const parsed = JSON.parse(img);
          return parsed.text || parsed.featured || parsed || null;
        } catch {
          return img;
        }
      }
      return img;
    }
    if (typeof img === "object") {
      const url = img.featured || img.thumbnail || img.mobile || img.raw || img.base || img.small || img.text;
      if (url && typeof url === "string") {
        if (url.startsWith("{")) {
          try {
            const parsed = JSON.parse(url);
            return parsed.text || parsed || null;
          } catch {
            return url;
          }
        }
        return url;
      }
    }
  }

  // Priority 7: gift360 CDN fallback by BrandId
  const brandId = item.BrandId || item.brandId;
  if (brandId) {
    return `https://images.gift360.io/${brandId}.png`;
  }

  return null;
}

export const FALLBACK_IMAGE = "/brand-placeholder.png";
