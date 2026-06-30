import { Minus, Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { FALLBACK_IMAGE } from "@/utils/imageUrl";

const FALLBACK = FALLBACK_IMAGE;

interface CartItemCardProps {
  itemId: string;
  brandName: string;
  image?: string;
  quantity: number;
  unitValue: number;
  lineTotal: number;
  onQuantityChange: (itemId: string, newQuantity: number) => void;
  onRemove: (itemId: string) => void;
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
  } catch {
    return FALLBACK;
  }
}

export default function CartItemCard({
  itemId,
  brandName,
  image,
  quantity,
  unitValue,
  lineTotal,
  onQuantityChange,
  onRemove,
}: CartItemCardProps) {
  const [imgSrc, setImgSrc] = useState(FALLBACK);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadImage() {
      if (!image) {
        setIsLoading(false);
        return;
      }

      try {
        const validatedUrl = await validateImage(image);
        if (isMounted) setImgSrc(validatedUrl);
      } catch {
        if (isMounted) setImgSrc(FALLBACK);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadImage();
    return () => {
      isMounted = false;
    };
  }, [image]);

  return (
    <div className="bg-white rounded-[10px] border" style={{ border: '0.5px solid #E5E7EB', width: 342, height: 120 }}>
      <div className="p-3 h-full flex gap-3 items-center">
      {/* Image */}
      <div className="w-16 h-16 rounded-md bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
        {isLoading ? (
          <div className="w-full h-full bg-gray-200 animate-pulse" />
        ) : (
          <img
            src={imgSrc}
            alt={brandName}
            className="w-full h-full object-contain p-1"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Brand Name */}
        <h3 className="font-semibold text-gray-900 truncate">{brandName}</h3>

        {/* Price per item */}
        <p className="text-sm text-gray-500 mt-1">{/* voucher text placeholder */}</p>

        {/* Quantity Stepper */}
        <div className="flex items-center gap-2 mt-3 w-fit">
          <button
            onClick={() => onQuantityChange(itemId, Math.max(1, quantity - 1))}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Minus className="w-4 h-4 text-gray-600" />
          </button>
          <span className="w-8 text-center font-medium">{quantity}</span>
          <button
            onClick={() => onQuantityChange(itemId, quantity + 1)}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Right: Total Price + Remove */}
      <div className="flex flex-col items-end justify-between h-full">
        <div className="text-right">
          <p className="text-lg font-bold text-purple-600">₹{lineTotal.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>

        <button
          onClick={() => onRemove(itemId)}
          className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
          title="Remove item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      </div>
    </div>
  );
}
