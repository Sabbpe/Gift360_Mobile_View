import React, { useEffect, useState } from 'react';
import type { Brand } from '@/types/brand';
import BuyButton from './BuyButton';
import QuickBuyModal from '@/components/QuickBuyModal';
import { getImageUrl, FALLBACK_IMAGE } from '@/utils/imageUrl';
import superCoinImg from "@/assets/SuperCOin-removebg-preview.png";

const FALLBACK = FALLBACK_IMAGE;

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

export default function ProductCard({ brand, onBuy, variant = 'category' }: { brand: Brand; onBuy?: (id: string) => void; variant?: 'category' | 'recommended' }) {
  const [imgSrc, setImgSrc] = useState<string>(FALLBACK);
  const [isLoading, setIsLoading] = useState(true);
  const [showQuickBuy, setShowQuickBuy] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const imageUrl = getImageUrl(brand);
      const sabbpeUrl = `https://images.gift360.io/${brand.BrandId}.png`;
      if (!imageUrl) {
        try { const u = await validateImage(sabbpeUrl); if (mounted) setImgSrc(u); }
        catch { if (mounted) setImgSrc(FALLBACK); }
      } else {
        try { const u = await validateImage(imageUrl); if (mounted) setImgSrc(u); }
        catch { try { const u = await validateImage(sabbpeUrl); if (mounted) setImgSrc(u); } catch { if (mounted) setImgSrc(FALLBACK); } }
      }
      if (mounted) setIsLoading(false);
    })();
    return () => { mounted = false; };
  }, [brand]);

  const price = brand.MinPrice || brand.MaxPrice || 0;

  if (variant === 'recommended') {
    const priceValue = price;
    return (
      <>
        <article
          className="w-[120px] min-w-[120px] h-[80px] snap-start flex-shrink-0 rounded-[8px] bg-white"
          style={{ boxShadow: '0 4px 10px rgba(0,0,0,0.08)', padding: 8, position: 'relative' }}
        >
          <img src={superCoinImg} alt="SuperCoin" className="absolute top-1 right-1 w-[16px] h-[16px] object-contain drop-shadow-sm z-10" />
          <div className="flex items-start gap-2" style={{ height: 32 }}>
            <div className="flex-shrink-0" style={{ width: 40, height: 32, borderRadius: 8, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isLoading ? (
                <div style={{ width: 34, height: 28 }} />
              ) : imgSrc === FALLBACK ? (
                <div style={{ width: 34, height: 28 }} />
              ) : (
                <img src={imgSrc} alt={brand.BrandName} style={{ width: 34, height: 28, objectFit: 'contain' }} />
              )}
            </div>

            <div className="min-w-0" style={{ flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="text-[12px] font-semibold text-[#111827] truncate">{brand.BrandName}</span>
                <span className="text-[10px] text-[#6B7280] truncate">{priceValue > 0 ? `₹${priceValue.toLocaleString()} Voucher` : 'Voucher'}</span>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: '#E5E7EB', marginTop: 6, marginBottom: 6 }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="text-[12px] font-bold text-[#111827]">{priceValue > 0 ? `₹${priceValue.toLocaleString()}` : '-'}</div>
            <button
              onClick={() => { if (onBuy) onBuy(brand.BrandId); else setShowQuickBuy(true); }}
              style={{ background: 'linear-gradient(90deg,#7C3AED,#3B82F6)', color: 'white', padding: '6px 10px', borderRadius: 18, fontSize: 11, fontWeight: 600 }}
            >
              Buy
            </button>
          </div>
        </article>

        <QuickBuyModal brand={brand} isOpen={showQuickBuy} onClose={() => setShowQuickBuy(false)} brandImage={imgSrc} />
      </>
    );
  }

  return (
    <>
      <article className="bg-white rounded-[12px] shadow-md w-[120px] min-w-[120px] h-[130px] min-h-[130px] p-4 flex flex-col justify-between h-full flex-none relative">
        <img src={superCoinImg} alt="SuperCoin" className="absolute top-2 right-2 w-[18px] h-[18px] object-contain drop-shadow-sm z-10" />
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-[8px] bg-gray-100 flex items-center justify-center overflow-hidden flex-none">
            {isLoading ? (
              <div className="w-6 h-6 bg-gray-200" />
            ) : imgSrc === FALLBACK ? (
              <div className="w-6 h-6 bg-gray-300" />
            ) : (
              <img src={imgSrc} alt={brand.BrandName} className="w-full h-full object-contain" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium text-gray-900 truncate">{brand.BrandName}</div>
            <div className="text-[10px] font-normal text-gray-400">E-Gift Card</div>
          </div>
        </div>

        <div className="border-t my-2.5" />

        <div className="flex justify-between items-center mt-1">
          <div className="font-semibold text-base">{price > 0 ? `₹${price.toLocaleString()}` : '-'}</div>
          <BuyButton
            className="py-1.5 px-2.5 text-[11px] font-semibold rounded-full bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] text-white flex-shrink-0"
            onClick={() => {
              if (onBuy) onBuy(brand.BrandId);
              else setShowQuickBuy(true);
            }}
          />
        </div>
      </article>

      <QuickBuyModal brand={brand} isOpen={showQuickBuy} onClose={() => setShowQuickBuy(false)} brandImage={imgSrc} />
    </>
  );
}
