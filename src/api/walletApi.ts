import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_BRAND_API_URL;

export interface WalletBalance {
  clientId: string;
  totalBalance: number;
  balance: number;
  cardBalance: number;
  bonusBalance: number;
  offerBalance: number;
  cashBalance: number;
  voucherCashbackBalance: number;
  /** % of the cart's cashback value that may be redeemed from the wallet (e.g. 50). */
  cashbackRedeemPercent: number;
  /** Flat rupee ceiling on wallet redemption regardless of cart size (e.g. 100). */
  maxRedeemAmount: number;
}

export const fetchWalletBalance = async (clientId: string): Promise<WalletBalance> => {
  // ✅ Get token from localStorage
  const authUser = localStorage.getItem("authUser");
  const token = authUser ? JSON.parse(authUser).token : null;

  try {
    const response = await axios.post<WalletBalance>(
      `${API_BASE_URL}/wallet/${clientId}`,
      {}, // Empty body for POST
      {
        headers: {
          Authorization: `Bearer ${token}`, // ✅ Add token
        },
      }
    );
    return response.data;
  } catch (err) {
    // This call uses bare axios, so the shared 401 handler never saw it and an expired
    // session silently rendered as "0". Raise the same event the other clients raise.
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      window.dispatchEvent(new Event("auth:expired"));
    }
    throw err;
  }
};
