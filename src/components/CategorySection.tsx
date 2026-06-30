import React from 'react';
import type { Brand } from '@/types/brand';
import ProductCard from './ProductCard';

export default function CategorySection({ title, items, onBuy }: { title: string; items: Brand[]; onBuy?: (id: string) => void }) {
  const limited = items.slice(0, 8);
  return (
    <section className="w-full">
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
        {limited.map((b) => (
          <div key={b.BrandId} className="flex-none">
            <ProductCard brand={b} onBuy={onBuy} variant="recommended" />
          </div>
        ))}
      </div>
    </section>
  );
}
