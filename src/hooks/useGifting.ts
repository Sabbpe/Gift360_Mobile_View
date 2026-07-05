// hooks/useGifting.ts
import { useState } from "react";
import { scratchVoucher, giftVoucher } from "@/api/giftingApi";
import { useToast } from "@/hooks/use-toast";
import { useSendEmail } from "@/hooks/useSendEmail";
import type { GiftActionResponse, VoucherState, DeliveryChannel } from "@/types/order";

interface UseGiftingOptions {
  orderItemId:    string;
  clientId:       string;
  orderNumber:    string;
  brandName?:     string;
  voucherAmount?: string;
  /** Called after a successful terminal action so the parent can update its state. */
  onStateChange:  (orderItemId: string, newState: VoucherState) => void;
}

interface UseGiftingReturn {
  isScratchLoading: boolean;
  isGiftLoading:    boolean;
  confirmScratch:   () => Promise<void>;
  confirmGift: (args: {
    recipientEmail?:  string;
    recipientMobile?: string;
    deliveryChannel:  DeliveryChannel;
    personalMessage?: string;
    senderName?:      string;
    mediaUrl?:        string;
  }) => Promise<void>;
}

export function useGifting({
  orderItemId,
  clientId,
  orderNumber,
  brandName,
  voucherAmount,
  onStateChange,
}: UseGiftingOptions): UseGiftingReturn {
  const { toast }           = useToast();
  const { mutate: sendEmail } = useSendEmail();
  const [isScratchLoading, setIsScratchLoading] = useState(false);
  const [isGiftLoading,    setIsGiftLoading]    = useState(false);

  const confirmScratch = async () => {
    setIsScratchLoading(true);
    try {
      const result: GiftActionResponse = await scratchVoucher({ clientId, orderItemId });
      onStateChange(orderItemId, "SCRATCHED");
      toast({
        title:       "Voucher revealed! 🎉",
        description: result.message,
      });
    } catch (err: any) {
      const status  = err?.response?.status;
      const message = err?.response?.data?.message ?? "Something went wrong. Please try again.";

      if (status === 409) {
        toast({
          title:       "Already used",
          description: message,
          variant:     "destructive",
        });
        onStateChange(orderItemId, err?.response?.data?.message?.includes("gifted") ? "GIFTED" : "SCRATCHED");
      } else {
        toast({
          title:       "Could not reveal voucher",
          description: message,
          variant:     "destructive",
        });
      }
    } finally {
      setIsScratchLoading(false);
    }
  };

  const confirmGift = async ({
    recipientEmail,
    recipientMobile,
    deliveryChannel,
    personalMessage,
    senderName,
    mediaUrl,
  }: {
    recipientEmail?:  string;
    recipientMobile?: string;
    deliveryChannel:  DeliveryChannel;
    personalMessage?: string;
    senderName?:      string;
    mediaUrl?:        string;
  }) => {
    setIsGiftLoading(true);
    try {
      const result: GiftActionResponse = await giftVoucher({
        clientId,
        orderItemId,
        recipientEmail,
        recipientMobile,
        deliveryChannel,
        personalMessage,
        senderName,
        mediaUrl,
      });
      onStateChange(orderItemId, "GIFTED");

      // Fire gifting confirmation email to the buyer (non-blocking fire-and-forget).
      // Only when email channel is used.
      if (deliveryChannel === "EMAIL" || deliveryChannel === "BOTH") {
        const email = recipientEmail ?? "";
        sendEmail({
          clientId,
          orderNumber,
          templateName:    "gift_sent",
          recipientEmail:  email,
          personalMessage,
          brandName,
          voucherAmount,
        });
      }

      toast({
        title:       "Voucher gifted! 🎁",
        description: result.message,
      });
    } catch (err: any) {
      const status  = err?.response?.status;
      const message = err?.response?.data?.message ?? "Something went wrong. Please try again.";

      if (status === 409) {
        toast({
          title:       "Already used",
          description: message,
          variant:     "destructive",
        });
        onStateChange(orderItemId, err?.response?.data?.message?.includes("scratched") ? "SCRATCHED" : "GIFTED");
      } else {
        toast({
          title:       "Could not gift voucher",
          description: message,
          variant:     "destructive",
        });
      }
    } finally {
      setIsGiftLoading(false);
    }
  };

  return { isScratchLoading, isGiftLoading, confirmScratch, confirmGift };
}
