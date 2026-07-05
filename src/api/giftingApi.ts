// api/giftingApi.ts
import { giftcardApiClient } from "@/lib/valuedesignApi";
import type { GiftActionResponse, GiftRequest, ScratchRequest } from "@/types/order";

/**
 * Gets a pre-signed upload URL for gift media (photo/video).
 * Backend generates the URL, frontend uploads directly via PUT.
 */
export const getMediaUploadUrl = async (
  orderItemId: string,
  contentType: string,
): Promise<{ uploadUrl: string; cdnUrl: string }> => {
  const response = await giftcardApiClient.post("/media/upload-url", { orderItemId, contentType });
  return response.data;
};

/**
 * Confirms the buyer wants to reveal (use) the voucher themselves.
 * Sets is_scratched = true server-side.
 *
 * Throws on HTTP errors — caller handles 409 CONFLICT (already terminal).
 */
export const scratchVoucher = async (
  request: ScratchRequest
): Promise<GiftActionResponse> => {
  const response = await giftcardApiClient.post("/coupons/scratch", request);
  return response.data;
};

/**
 * Gifts the voucher to a recipient.
 * Sets is_gift = true server-side, stores encrypted email, fires gift email.
 *
 * ⚠️ recipientEmail is transmitted over HTTPS to the backend,
 *    which encrypts it before persistence. Never log it client-side.
 *
 * Throws on HTTP errors — caller handles 409 CONFLICT (already terminal).
 */
export const giftVoucher = async (
  request: GiftRequest
): Promise<GiftActionResponse> => {
  const response = await giftcardApiClient.post("/coupons/gift", request);
  return response.data;
};
