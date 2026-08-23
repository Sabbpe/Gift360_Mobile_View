// hooks/useGifting.ts
import { useState } from "react";
import { scratchVoucher, giftVoucher } from "@/api/giftingApi";
import { useToast } from "@/hooks/use-toast";
import { useSendEmail } from "@/hooks/useSendEmail";
import type { GiftActionResponse, VoucherState, DeliveryChannel } from "@/types/order";

interface UseGiftingOptions {
  orderItemId:    string;
  itemId?:        string;
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
  itemId,
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
      const result: GiftActionResponse = await scratchVoucher({ clientId, orderItemId, itemId });
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
        // Use the backend's explicit errorCode rather than guessing from the
        // message text - both terminal-state messages historically contain
        // the word "gifted", which previously caused an already-SCRATCHED
        // card (re-tapped/retried) to be incorrectly displayed as "Gifted".
        const errorCode = err?.response?.data?.errorCode;
        onStateChange(orderItemId, errorCode === "ALREADY_GIFTED" ? "GIFTED" : "SCRATCHED");
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
        itemId,
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
        // Use the backend's explicit errorCode rather than guessing from the
        // message text - the mirror-image of the same bug fixed in
        // confirmScratch above: "already gifted, cannot scratch" contains
        // the word "scratched", which previously caused an already-GIFTED
        // card to be incorrectly displayed as "SCRATCHED" on a retry.
        const errorCode = err?.response?.data?.errorCode;
        onStateChange(orderItemId, errorCode === "ALREADY_SCRATCHED" ? "SCRATCHED" : "GIFTED");
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
