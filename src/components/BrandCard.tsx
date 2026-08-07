import { Link } from "wouter";
import { Store } from "lucide-react";
import { useState, useEffect } from "react";
import type { Brand } from "@/types/brand";
import PaymentDetailsSheet from '@/components/PaymentDetailsSheet';
import { getImageUrl, FALLBACK_IMAGE } from "@/utils/imageUrl";
import superCoinImg from "@/assets/SuperCOin-removebg-preview.png";
import { isSuperCoinExcludedById, isSuperCoinExcluded } from "@/lib/supercoin-excluded-brands";

const FALLBACK = FALLBACK_IMAGE;

interface BrandCardProps {
  brand: Brand;
  variant?: 'compact' | 'tile';
  onPaymentSheetChange?: (open: boolean) => void;
  tileAction?: 'sheet' | 'details' | 'custom';
  onTileClick?: () => void;
}

async function validateImage(url: string): Promise<string> {
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => reject();
      img.src = url;
      setTimeout(() => reject(), 5000);
    });
  } catch { return FALLBACK; }
}

export default function BrandCard({
  brand,
  variant = 'compact',
  onPaymentSheetChange,
  tileAction = 'sheet',
  onTileClick,
}: BrandCardProps) {
  const [imgSrc, setImgSrc] = useState(FALLBACK);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);

  useEffect(() => {
    onPaymentSheetChange?.(showPaymentSheet);
  }, [onPaymentSheetChange, showPaymentSheet]);

  const rawImage = getImageUrl(brand);

  const displayPrice = Number(brand.MinPrice || brand.MaxPrice || 0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const sabbpeUrl = `https://images.gift360.io/${brand.BrandId}.png`;
      if (!rawImage) {
        try { const u = await validateImage(sabbpeUrl); if (mounted) setImgSrc(u); }
        catch { if (mounted) setImgSrc(FALLBACK); }
      } else {
        try { const u = await validateImage(rawImage); if (mounted) setImgSrc(u); }
        catch {
          try { const u = await validateImage(sabbpeUrl); if (mounted) setImgSrc(u); }
          catch { if (mounted) setImgSrc(FALLBACK); }
        }
      }
      if (mounted) setIsLoading(false);
    })();
    return () => { mounted = false; };
  }, [rawImage, brand.BrandId]);

  if (variant === 'tile') {
    const tileInner = (
      <div className="w-[72px] h-[72px] bg-white rounded-lg flex items-center justify-center mx-auto relative" style={{ boxShadow: '0 6px 18px rgba(2,6,23,0.08)' }}>
        {!isSuperCoinExcludedById(brand.BrandId) && !isSuperCoinExcluded(brand.BrandName) && (
          <img src={superCoinImg} alt="SuperCoin" className="absolute -top-1 -right-1 w-[18px] h-[18px] object-contain drop-shadow-sm z-10" />
        )}
        {isLoading ? (
          <div className="w-12 h-12 g-skeleton" />
        ) : imgSrc === FALLBACK ? (
          <Store className="h-8 w-8 text-muted-foreground/40" />
        ) : (
          <img src={imgSrc} alt={brand.BrandName} className="w-11 h-11 object-contain" onError={() => setImgSrc(FALLBACK)} />
        )}
      </div>
    );

    return (
      <>
        <div className="flex flex-col items-center">
          {tileAction === 'details' ? (
            <Link href={`/brands/${brand.BrandId}`} className="block w-full hover:scale-105 transition-transform">
              {tileInner}
            </Link>
          ) : tileAction === 'custom' ? (
            <button onClick={onTileClick} className="block w-full hover:scale-105 transition-transform">
              {tileInner}
            </button>
          ) : (
            <button onClick={() => setShowPaymentSheet(true)} className="block w-full hover:scale-105 transition-transform">
              {tileInner}
            </button>
          )}

          <div className="mt-1.5 text-center">
            <div className="text-xs font-semibold text-foreground line-clamp-2">{brand.BrandName}</div>
          </div>
        </div>

        {tileAction === 'sheet' && (
          <PaymentDetailsSheet brandId={brand.BrandId} open={showPaymentSheet} onClose={() => setShowPaymentSheet(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <div>
        <article
          className="w-[120px] min-w-[120px] h-[80px] snap-start flex-shrink-0 rounded-[8px] bg-white"
          style={{ boxShadow: '0 4px 10px rgba(0,0,0,0.08)', padding: 8, position: 'relative' }}
        >
          {!isSuperCoinExcludedById(brand.BrandId) && !isSuperCoinExcluded(brand.BrandName) && (
            <img src={superCoinImg} alt="SuperCoin" className="absolute top-1 right-1 w-[16px] h-[16px] object-contain drop-shadow-sm z-10" />
          )}
          <Link href={`/brands/${brand.BrandId}`} className="block">
            <div className="flex items-start gap-2" style={{ height: 32 }}>
              <div className="flex-shrink-0" style={{ width: 40, height: 32, borderRadius: 8, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isLoading ? (
                  <div style={{ width: 34, height: 28 }} />
                ) : imgSrc === FALLBACK ? (
                  <Store className="h-6 w-6 text-muted-foreground/40" />
                ) : (
                  <img src={imgSrc} alt={brand.BrandName} style={{ width: 34, height: 28, objectFit: 'contain' }} onError={() => setImgSrc(FALLBACK)} />
                )}
              </div>

              <div className="min-w-0" style={{ flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="text-[12px] font-semibold text-[#111827] truncate">{brand.BrandName}</span>
                  <span className="text-[10px] text-[#6B7280] truncate">{displayPrice ? `₹${displayPrice.toLocaleString()} Voucher` : 'E-Gift Card'}</span>
                </div>
              </div>
            </div>
          </Link>

          <div style={{ height: 1, background: '#E5E7EB', marginTop: 6, marginBottom: 6 }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="text-[12px] font-bold text-[#111827]">{displayPrice ? `₹${displayPrice.toLocaleString()}` : '-'}</div>
            <button
              onClick={() => setShowPaymentSheet(true)}
              style={{ background: 'linear-gradient(90deg,#7C3AED,#3B82F6)', color: 'white', padding: '6px 10px', borderRadius: 18, fontSize: 11, fontWeight: 600 }}
            >
              Buy
            </button>
          </div>
        </article>
      </div>

      <PaymentDetailsSheet brandId={brand.BrandId} open={showPaymentSheet} onClose={() => setShowPaymentSheet(false)} />
    </>
  );
}
