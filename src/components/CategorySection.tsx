import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Brand } from '@/types/brand';
import ProductCard from './ProductCard';
import BrandCard from './BrandCard';

export default function CategorySection({ title, items, onBuy }: { title: string; items: Brand[]; onBuy?: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="w-full">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="inline-block bg-white rounded-xl px-3 py-1">
          <h3 className="text-base font-bold text-black">{title}</h3>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 bg-white rounded-xl px-3 py-1 text-xs font-semibold text-[#7C3AED] active:scale-95 transition-transform"
          aria-expanded={expanded}
          aria-label={expanded ? `Collapse ${title}` : `View all ${title} vouchers`}
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              View all ({items.length}) <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>

      {expanded ? (
        <div className="grid grid-cols-3 gap-x-4 gap-y-6 pb-4 animate-in fade-in duration-200">
          {items.map((b) => (
            <BrandCard key={b.BrandId} brand={b} />
          ))}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
          {items.map((b) => (
            <div key={b.BrandId} className="flex-none">
              <ProductCard brand={b} onBuy={onBuy} variant="recommended" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
