import React from 'react';
import type { Brand } from '@/types/brand';
import ProductCard from './ProductCard';

export default function CategorySection({ title, items, onBuy }: { title: string; items: Brand[]; onBuy?: (id: string) => void }) {
  return (
    <section className="w-full">
      <div className="inline-block bg-white rounded-xl px-3 py-1 mb-3">
        <h3 className="text-base font-bold text-black">{title}</h3>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
        {items.map((b) => (
          <div key={b.BrandId} className="flex-none">
            <ProductCard brand={b} onBuy={onBuy} variant="recommended" />
          </div>
        ))}
      </div>
    </section>
  );
}
