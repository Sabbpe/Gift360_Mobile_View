// src/api/paymentApi.ts
import axios from "axios";
import type { PaymentProcessRequest, PaymentResponse } from "@/types/payment";
import { giftcardApiClient } from "@/lib/valuedesignApi";

const PAYMENT_URL = import.meta.env.VITE_PAYMENT_API_URL;

export interface BackendPaymentInitiationResponse {
  status: boolean | number;
  payment_url?: string;
  paymentUrl?: string;
  transaction_id?: string;
  merchant_order_ref?: string;
  gateway?: string;
  message?: string;
  data?: string;
}

// Backend-mediated payment initiation.
// The backend owns the merchant credentials and computes the net payable,
// so the frontend never sends an amount or token to the gateway directly.
export const initiateBackendPayment = async (
  orderNumber: string
): Promise<BackendPaymentInitiationResponse> => {
  const response = await giftcardApiClient.post(
    `/orders/${orderNumber}/initiate-payment`
  );
  return response.data;
};

// Initiate Payment Process - FOR NTT DATA
export const initiatePaymentProcess = async (
  amount: number,
  orderNumber: string,
  encryptedData: string,
  token: string
): Promise<PaymentResponse> => {
  const now = new Date();

  // Get current timestamp in IST
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  const payload: PaymentProcessRequest = {
    payInstrument: {
      extras: {
        udf1: "-",
        udf2: import.meta.env.VITE_PAYMENT_CLIENT_ID,
        udf3: "-",
        udf4: import.meta.env.VITE_PAYMENT_CLIENT,
        udf5: "-",
        udf6: token,
        udf7: import.meta.env.VITE_PAYMENT_RETURN_URL,
        udf8: "-",
        udf9: "-",
        udf10: encryptedData,
      },
      payDetails: {
        amount: Number(amount.toFixed(2)),
        product: import.meta.env.VITE_PAYMENT_PRODUCT,
        custAccNo: null,
        txnCurrency: "INR",
      },
      custDetails: {
        custFirstName: import.meta.env.VITE_PAYMENT_CUSTFIRSTNAME,
        custEmail: import.meta.env.VITE_PAYMENT_CUSTEMAIL,
        custMobile: import.meta.env.VITE_PAYMENT_CUSTMOBILE,
      },
      headDetails: {
        api: "AUTH",
        version: "OTSv1.1",
        platform: "FLASH",
      },
      merchDetails: {
        userId: import.meta.env.VITE_PAYMENT_TRANSACTION_USERID,
        merchId: import.meta.env.VITE_PAYMENT_TRANSACTION_MERCHANTID,
        merchTxnId: orderNumber,
        merchTxnDate: timestamp,
      },
    },
  };

  console.log("Initiating NTT Data payment process with:", payload);

  const response = await axios.post<PaymentResponse>(
    `${PAYMENT_URL}/PaymentProcess`,
    payload
  );

  console.log("NTT Data payment response:", response.data);

  return response.data;
};
