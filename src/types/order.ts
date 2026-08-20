// types/order.ts
export interface OrderItemMeta {
  brand_id: string;
  brand_code: string;
  brand_name: string;
  category: string;
  images: string; // JSON string
}

export interface CouponItem {
  getCardNo: string;
  getCardPin: string;
  getCardStatus: string;
  getExpiryDate: string;
  balanceBasic: string;
  balanceBonus: string;
  balanceTotal: string;
  bonusGiven: string;
  dealNo: string;
  receiptNo: string;
}

export interface BrandDetail {
  product_name: string;
  voucher_name: string;
  items: CouponItem[];
}

export interface VDRawResponse {
  brand_details: BrandDetail[];
  wallet_balance: string;
}

export interface Coupon {
  coupon_id: string;
  vd_raw_response: VDRawResponse;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  order_item_id: string;
  brand_id: string;
  quantity: number;
  unit_value: number;
  line_total: number;
  meta: OrderItemMeta | Record<string, never>;
  created_at: string;
  coupons?: Coupon[]; // ✅ Added coupons

  // ── Gifting state (populated by the /neworders stored procedure) ──────────
  /** True once the buyer has revealed (scratched) this voucher for personal use. */
  is_scratched?:        boolean;
  /** True once the buyer has gifted this voucher to someone else. */
  is_gift?:              boolean;
  /** ISO timestamp of when the voucher was scratched. Null if not yet scratched. */
  scratched_at?:         string | null;
  /** ISO timestamp of when the gift was sent. Null if not gifted. */
  gift_sent_at?:         string | null;
  // Note: gift_recipient_email is intentionally NOT returned to the frontend (encrypted at rest)
}

export type VoucherState =
  | 'PENDING'    // is_scratched=false, is_gift=false — gate fires on click
  | 'SCRATCHED'  // terminal — show revealed code
  | 'GIFTED';    // terminal — show locked card

/** Derive the display state from an order item. */
export function getVoucherState(item: Pick<OrderItem, 'is_scratched' | 'is_gift'>): VoucherState {
  if (item.is_scratched) return 'SCRATCHED';
  if (item.is_gift)      return 'GIFTED';
  return 'PENDING';
}

// ── Gifting API types ─────────────────────────────────────────────────────────

export interface ScratchRequest {
  clientId:     string;
  orderItemId:  string;
  itemId?:      string;
}

export type DeliveryChannel = 'EMAIL' | 'WHATSAPP' | 'BOTH';

export interface GiftRequest {
  clientId:         string;
  orderItemId:      string;
  itemId?:          string;
  // ── Phase 1: email + card personalisation ──────────────────────────────────
  recipientEmail?:  string;
  senderName?:      string;
  personalMessage?: string;
  mediaUrl?:        string;
  // ── Phase 1b: WhatsApp ─────────────────────────────────────────────────────
  /** E.164 without '+', e.g. "919876543210" */
  recipientMobile?: string;
  deliveryChannel?: DeliveryChannel;
}

export interface GiftActionResponse {
  state:        'SCRATCHED' | 'GIFTED';
  message:      string;
  orderItemId:  string;
}

export interface OrderPricing {
  subtotal: number;
  coupon_discount: number;
  wallet_amount: number;
  coins_redeemed: number;
  final_payable: number;
}

export interface Order {
  order_id: string;
  client_id: string;
  order_number: string;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  items: OrderItem[];
  pricing?: OrderPricing;
  type?: string;
}

export interface OrdersResponse {
  orders: Order[];
}

export interface ValidateOrderRequest {
  orderNumber: string;
  cartTotal: number;
  walletAmount: number;
  walletUsed: boolean;
}

export interface OrderDetails {
  totalAmount: number;
  walletAmount: number;
  walletUsed: boolean;
  status: string;
}

export interface ValidateOrderResponse {
  valid: boolean;
  message: string;
  requiresPayment: boolean;
  amountToPay: number;
  orderNumber: string;
  orderDetails?: OrderDetails;
}

export interface GiftcardOrderDetailsResponse {
  orderId: string;
  orderNumber: string;
  clientId: string;
  invoiceNumber?: string | null;
  status: string;
  currency: string;
  totalAmount: number;
  walletUsed: boolean;
  walletAmount: number;
  createdAt?: string;
  paidAt?: string | null;
  couponDiscount: number;
  netAmountPaid: number;
  coinsEarned?: number | null;
  coinsRedeemed?: number | null;
  coinIssued?: boolean | null;
  scMerchantTxnId?: string | null;
  scReferenceTxnId?: string | null;
  scRedeemTxnId?: string | null;
  scFkResponseId?: string | null;
  coinHoldExpiry?: number | null;
  items?: OrderItem[];
}
