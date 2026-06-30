interface OrderSummaryProps {
  itemTotal: number;
  processingFee?: number;
  discount?: number;
  couponCode?: string;
  totalAmount: number;
}

export default function OrderSummary({
  itemTotal,
  processingFee = 0,
  discount = 0,
  couponCode,
  totalAmount,
}: OrderSummaryProps) {
  return (
    <div className="bg-white rounded-xl p-4" style={{ width: 342 }}>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Item Total</span>
          <span className="font-medium">₹{itemTotal.toLocaleString()}</span>
        </div>

        {processingFee > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Processing Fee</span>
            <span className="font-medium">₹{processingFee.toLocaleString()}</span>
          </div>
        )}

        {discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-green-600">Discount {couponCode && `(${couponCode})`}</span>
            <span className="font-medium text-green-600">-₹{discount.toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
        <span className="font-semibold text-gray-900">Total to Pay</span>
        <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">₹{totalAmount.toLocaleString()}</span>
      </div>
    </div>
  );
}
