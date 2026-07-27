import {
  calculateOrderTotals,
  effectiveUnitPrice,
  isSaleActive,
  viewerUnitPrice,
} from "@/domain/services/pricing";

describe("pricing policy", () => {
  it("applies a sale only within the half-open sale interval", () => {
    const variant = {
      regularPrice: 8000,
      salePrice: 6400,
      saleStartAt: "2026-06-30T03:00:00.000Z",
      saleEndAt: "2026-07-02T03:00:00.000Z",
    };
    expect(isSaleActive(variant, "2026-06-30T03:00:00.000Z")).toBe(true);
    expect(effectiveUnitPrice(variant, "2026-07-01T03:00:00.000Z")).toBe(6400);
    expect(isSaleActive(variant, "2026-07-02T03:00:00.000Z")).toBe(false);
    expect(effectiveUnitPrice(variant, "2026-07-02T03:00:00.000Z")).toBe(8000);
  });

  it("floors the gold discount for each SKU unit before multiplying quantity", () => {
    const totals = calculateOrderTotals([{ unitEffectivePrice: 999, quantity: 2 }], "gold");
    expect(totals.lines[0]).toMatchObject({
      unitDiscountAmount: 49,
      lineDiscountAmount: 98,
      lineTotalAmount: 1900,
    });
    expect(totals).toMatchObject({
      subtotalAmount: 1998,
      discountAmount: 98,
      shippingAmount: 500,
      totalAmount: 2400,
      freeShippingRemainingAmount: 3002,
    });
  });

  it("uses the same subtotal shipping rule for every membership rank", () => {
    const lines = [
      { unitEffectivePrice: 2000, quantity: 2 },
      { unitEffectivePrice: 1500, quantity: 1 },
    ];
    expect(calculateOrderTotals(lines, "regular")).toMatchObject({
      subtotalAmount: 5500,
      discountAmount: 0,
      shippingAmount: 0,
      totalAmount: 5500,
    });
    expect(calculateOrderTotals(lines, "gold")).toMatchObject({
      discountAmount: 275,
      totalAmount: 5225,
    });
    expect(calculateOrderTotals(lines, "platinum")).toMatchObject({
      discountAmount: 550,
      shippingAmount: 0,
      totalAmount: 4950,
    });
    expect(viewerUnitPrice(6400, "gold")).toBe(6080);
  });
});
