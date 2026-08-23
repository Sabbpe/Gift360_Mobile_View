// api/giftingApi.ts
import { giftcardApiClient } from "@/lib/valuedesignApi";
import type { GiftActionResponse, GiftRequest, ScratchRequest, CardItem } from "@/types/order";

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

/**
 * Fetches per-physical-card gift/scratch state for a multi-card order item.
 *
 * WHY THIS EXISTS: the order-details response only ever exposed one shared
 * is_gift/is_scratched flag per order item — meaning a quantity > 1
 * purchase (e.g. 2 PizzaHut cards in one order) had no way to tell its
 * cards apart. Scratching one card made the WHOLE item look scratched,
 * which then either wrongly revealed the sibling card too, or (worse)
 * blocked gifting it entirely, even though it was never touched.
 *
 * Call this alongside the regular order-details fetch for any item with
 * quantity > 1, then zip the result (by cardIndex) with the
 * vd_raw_response.brand_details[0].items[] array already used for display,
 * to get each card's real itemId + its OWN isGift/isScratched — and pass
 * that itemId into scratchVoucher()/giftVoucher() instead of leaving it
 * undefined, so each card can be scratched or gifted independently.
 */
export const getCardItems = async (
  clientId: string,
  orderItemId: string
): Promise<CardItem[]> => {
  const response = await giftcardApiClient.get("/coupons/card-items", {
    params: { clientId, orderItemId },
  });
  return response.data;
};
