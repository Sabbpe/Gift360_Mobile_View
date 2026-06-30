import { AlertCircle, ChevronLeft, Loader2, Store } from "lucide-react";
import type { TopBrandVoucher } from "@/api/brandSearchApi";
import { getImageUrl, FALLBACK_IMAGE } from "@/utils/imageUrl";

type BrandVoucherModalProps = {
  open: boolean;
  vouchers: TopBrandVoucher[];
  brandName: string;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
  onVoucherSelect: (voucher: TopBrandVoucher) => void;
};

export default function BrandVoucherModal({
  open,
  vouchers,
  brandName,
  loading,
  error,
  onClose,
  onRetry,
  onVoucherSelect,
}: BrandVoucherModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[4px]"
        onClick={onClose}
      />

      <div className="absolute inset-x-0 bottom-0 flex justify-center">
        <style>{`
          .voucher-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            overflow-y: auto;
          }
          .voucher-card {
            display: flex;
            gap: 12px;
            padding: 12px;
            border-radius: 16px;
            background: #f7f7f7;
            cursor: pointer;
            box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
          }
          .voucher-img {
            width: 50px;
            height: 50px;
            border-radius: 10px;
            flex-shrink: 0;
          }
          .voucher-info h4 {
            font-size: 14px;
            font-weight: 600;
            color: #101828;
          }
          .voucher-info p {
            font-size: 12px;
            line-height: 1.4;
          }
          .voucher-bottom {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin-top: 6px;
            align-items: center;
          }
          .price {
            font-size: 14px;
            font-weight: 700;
            color: #111827;
          }
          .discount {
            color: #7c3aed;
            font-size: 11px;
            font-weight: 500;
            text-align: right;
          }
          .voucher-modal-content::-webkit-scrollbar {
            width: 6px;
          }
          .voucher-modal-content::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.45);
            border-radius: 999px;
          }
        `}</style>
        <section className="relative flex h-[72vh] min-h-[560px] w-full max-w-[390px] flex-col overflow-hidden rounded-t-[40px] bg-[#F5F6FA] shadow-[0px_-4px_20px_rgba(0,0,0,0.2)] animate-slide-up">
          <div className="relative flex items-center gap-3 px-4 pb-3 pt-5">
            <span className="absolute left-1/2 top-3 h-[10px] w-[100px] -translate-x-1/2 rounded-full bg-[#D9D9D9]" />
            <button
              onClick={onClose}
              aria-label="Back"
              className="relative z-10 grid h-6 w-6 place-items-center"
            >
              <ChevronLeft className="h-6 w-6 text-black" strokeWidth={2.2} />
            </button>
            <h3 className="truncate text-[14px] font-medium leading-[21px] text-[#3E3E3E]">
              {brandName || "Brand Vouchers"}
            </h3>
          </div>

          <div className="voucher-modal-content flex-1 overflow-y-auto px-4 pb-6">
            {loading && (
              <div className="flex h-full min-h-[320px] items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-[#667085]">
                  <Loader2 className="h-7 w-7 animate-spin text-[#7C3AED]" />
                  <p className="text-sm font-medium">Loading vouchers...</p>
                </div>
              </div>
            )}

            {!loading && error && (
              <div className="mt-4 rounded-[16px] bg-white px-5 py-6 text-center shadow-[0_4px_14px_rgba(15,23,42,0.08)]">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#FEE4E2]">
                  <AlertCircle className="h-5 w-5 text-[#B42318]" />
                </div>
                <p className="mt-3 text-sm font-semibold text-[#101828]">
                  Unable to load vouchers
                </p>
                <p className="mt-1 text-xs text-[#667085]">{error}</p>
                <button
                  onClick={onRetry}
                  className="mt-4 rounded-full bg-[linear-gradient(90deg,#7C3AED,#3B82F6)] px-4 py-2 text-sm font-semibold text-white"
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && (
              <>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <h5 className="text-[15px] font-semibold text-[#101828]">
                      Available Vouchers
                    </h5>
                    <p className="mt-1 text-[11px] text-[#667085]">
                      Choose a voucher to continue to payment
                    </p>
                  </div>
                  {vouchers.length > 0 && (
                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-[#475467] shadow-sm">
                      {vouchers.length} options
                    </span>
                  )}
                </div>

                {vouchers.length === 0 ? (
                  <div className="mt-4 rounded-[16px] bg-white px-5 py-8 text-center shadow-[0_4px_14px_rgba(15,23,42,0.08)]">
                    <p className="text-sm font-semibold text-[#101828]">
                      No vouchers available
                    </p>
                    <p className="mt-1 text-xs text-[#667085]">
                      Please try another brand.
                    </p>
                  </div>
                ) : (
                  <div className="voucher-list mt-4">
                    {vouchers.map((item, index) => {
                      const imageSrc = getImageUrl(item) || FALLBACK_IMAGE;
                      const displayPrice = item.minPrice || item.maxPrice || 0;

                      return (
                        <div
                          key={`${item.brandId}-${displayPrice}-${index}`}
                          className="voucher-card"
                          onClick={() => onVoucherSelect(item)}
                        >
                          <img
                            src={imageSrc}
                            alt={item.brandName}
                            className="voucher-img object-contain bg-white"
                            onError={(e) => {
                              e.currentTarget.src = FALLBACK_IMAGE;
                            }}
                          />

                          <div className="voucher-info min-w-0 flex-1">
                            <h4 className="truncate">{item.brandName}</h4>
                            <p className="truncate text-[#667085]">
                              {item.category || "Gift Voucher"}
                            </p>

                            <div className="voucher-bottom">
                              <span className="price">
                                Rs.{displayPrice.toLocaleString()}
                              </span>
                              <span className="discount">
                                {item.discount ? `${item.discount}% Cashback` : "Cashback"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
