import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_BRAND_API_URL;

export interface SessionResumeUserInfo {
  name: string;
  email: string;
  mobile: string;
  clientId: string;
}

export interface SessionResumeResponse {
  token: string;
  userInfo: SessionResumeUserInfo;
}

/**
 * Session resume — exchange the encrypted order reference (`txnid`) from the
 * payment-result URL for the customer's EXISTING session token.
 *
 * WHY: after paying on an external gateway (Easebuzz/UPI), the payment-result
 * page can load in a browser context that shares no storage with the browser
 * the customer logged in on (e.g. Google Pay's in-app browser). In that context
 * there is no `authUser`, so protected calls go out without a token and the
 * user appears logged out. Restoring from the `txnid` removes the dependence on
 * browser storage entirely.
 *
 * The `txnid` is ValueDesign's own `AES(orderNumber|clientId)`; ValueDesign
 * decrypts it, verifies the order belongs to that clientId, was initiated
 * recently, and hasn't been used, then returns the CURRENT active token. No new
 * login is created, so the one-session-per-customer rule is preserved.
 *
 * Deliberately uses plain axios (no auth interceptor):
 *  - it must run without a token, and
 *  - a 400/404/409/410 here must NOT be treated as a logout.
 */
export async function resumeSession(txnid: string): Promise<SessionResumeResponse> {
  const response = await axios.post<SessionResumeResponse>(
    `${API_BASE_URL}/v1/session/resume`,
    { txnid },
    { headers: { "Content-Type": "application/json" } }
  );
  return response.data;
}
