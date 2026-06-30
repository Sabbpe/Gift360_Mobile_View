import { useLocation } from 'wouter';
import { Home, Grid2X2, Store, ShoppingCart } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';

const navItems = [
  { label: 'Home', Icon: Home, href: '/' },
  { label: 'Categories', Icon: Grid2X2, href: '/categories' },
  { label: 'Brands', Icon: Store, href: '/brands' },
  { label: 'Cart', Icon: ShoppingCart, href: '/cart' },
];

export default function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const { user } = useAuthContext();
  const { totalItems } = useCart(user?.clientId);
  const [cartPulse, setCartPulse] = useState(false);
  const previousTotalItemsRef = useRef(totalItems);

  if (location.startsWith('/orders')) {
    return null;
  }

  useEffect(() => {
    if (totalItems > previousTotalItemsRef.current) {
      setCartPulse(true);
      const timeoutId = window.setTimeout(() => setCartPulse(false), 800);
      previousTotalItemsRef.current = totalItems;
      return () => window.clearTimeout(timeoutId);
    }

    previousTotalItemsRef.current = totalItems;
  }, [totalItems]);

  return (
    <>
      <style>{`
        @keyframes cart-plus-burst {
          0% { opacity: 0; transform: translateY(6px) scale(0.7); }
          20% { opacity: 1; transform: translateY(-2px) scale(1); }
          100% { opacity: 0; transform: translateY(-14px) scale(1.05); }
        }
        .cart-plus-burst {
          animation: cart-plus-burst 0.8s ease-out forwards;
        }
      `}</style>
    <nav className="md:hidden z-[100]" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 63, width: '100%', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0px -2px 10px rgba(0,0,0,0.1)' }}>
      <div className="grid h-full grid-cols-4 px-[16px]">
        {navItems.map(({ label, Icon, href }) => {
          const active = href === '/' ? location === '/' : location.startsWith(href);
          return (
            <button key={label} onClick={() => setLocation(href)} className="relative flex flex-col items-center justify-center gap-[3px] active:scale-95">
              {label === 'Cart' && cartPulse && (
                <span className="cart-plus-burst pointer-events-none absolute top-1 text-[11px] font-bold text-emerald-500">
                  +1
                </span>
              )}
              <Icon className="h-[20px] w-[20px]" strokeWidth={2.4} color={active ? "#10aeec" : "#092f82"} fill={label === "Cart" ? (active ? "#10aeec" : "#092f82") : "none"} />
              {label === 'Cart' && totalItems > 0 && (
                <span className="absolute top-1 right-5 min-w-[16px] h-4 rounded-full bg-primary px-1 text-[9px] font-bold text-white flex items-center justify-center">
                  {totalItems}
                </span>
              )}
              <span className={`text-[7px] font-medium leading-none ${active ? "text-[#10aeec]" : "text-[#092f82]"}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
    </>
  );
}
