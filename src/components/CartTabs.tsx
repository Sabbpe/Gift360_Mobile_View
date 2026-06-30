import { ShoppingCart } from "lucide-react";

type CartTab = "cart";

interface CartTabsProps {
  activeTab: CartTab;
  onTabChange: (tab: CartTab) => void;
}

export default function CartTabs({ activeTab, onTabChange }: CartTabsProps) {
  const tabs = [
    { id: "cart", label: "Cart", Icon: ShoppingCart },
  ] as const;

  return (
    <div className="w-full flex justify-center pt-6">
      <div
        className="w-[342px] h-[50px] rounded-[30px] bg-white flex items-center justify-center px-[5px]"
        style={{ border: "0.2px solid #A1A1A1", boxShadow: "2px 4px 4px 0px #00000040" }}
      >
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`w-[161px] h-[40px] flex items-center justify-center gap-2 font-semibold text-[16px] rounded-[30px] transition-all ${
              activeTab === id
                ? "text-white"
                : "text-[#6B7280]"
            }`}
            style={
              activeTab === id
                ? { background: "linear-gradient(90deg, #7B61FF, #5B3FFF)" }
                : { background: "transparent" }
            }
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
