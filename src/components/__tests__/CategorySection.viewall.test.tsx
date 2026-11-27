import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import CategorySection from "../CategorySection";

// Keep the test about the grid itself: stub the heavy pieces the cards pull in.
vi.mock("../QuickBuyModal", () => ({ default: () => null }));
vi.mock("../PaymentDetailsSheet", () => ({ default: () => null }));
vi.mock("../BuyButton", () => ({
  default: ({ onClick }: { onClick?: () => void }) => <button onClick={onClick}>Buy</button>,
}));

const brands = [
  { BrandId: "id-amazon-fresh", BrandName: "Amazon Fresh Voucher", Category: "Grocery Dept. Stores", Discount: 1, minPrice: 100, maxPrice: 10000, DenominationList: [] },
  { BrandId: "id-big-bazaar", BrandName: "Big Bazaar", Category: "Grocery Dept. Stores", Discount: 2, minPrice: 100, maxPrice: 5000, DenominationList: [] },
  { BrandId: "id-jio-mart", BrandName: "Jio Mart", Category: "Grocery Dept. Stores", Discount: 2, minPrice: 250, maxPrice: 5000, DenominationList: [] },
] as any[];

describe("CategorySection after tapping View all", () => {
  it("keeps an active Buy button on every card, and nothing links to the /brands/:id page", () => {
    const onBuy = vi.fn();
    const { container } = render(<CategorySection title="Grocery Dept. Stores" items={brands} onBuy={onBuy} />);

    fireEvent.click(screen.getByRole("button", { name: /View all/i }));

    const buyButtons = screen.getAllByRole("button", { name: /^Buy$/ });
    expect(buyButtons).toHaveLength(3);
    buyButtons.forEach((b) => expect(b).not.toBeDisabled());

    const linksToBrandPage = Array.from(container.querySelectorAll("a")).filter((a) => (a.getAttribute("href") || "").startsWith("/brands/"));
    expect(linksToBrandPage).toHaveLength(0);

    fireEvent.click(buyButtons[0]);
    expect(onBuy).toHaveBeenCalledTimes(1);
    expect(onBuy).toHaveBeenCalledWith("id-amazon-fresh");
  });

  it("shows the same three cards before and after View all (nothing is lost on expand)", () => {
    const { container } = render(<CategorySection title="Grocery Dept. Stores" items={brands} onBuy={() => {}} />);
    const before = within(container).getAllByRole("button", { name: /^Buy$/ }).length;
    fireEvent.click(screen.getByRole("button", { name: /View all/i }));
    const after = within(container).getAllByRole("button", { name: /^Buy$/ }).length;
    expect([before, after]).toEqual([3, 3]);
  });
});
