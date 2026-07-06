import type { BundleCost } from '@hairvana/shared';

interface Props {
  bundleCost: BundleCost;
}

/** Itemised bundle cost breakdown: products + service fee + platform fee = total. */
export default function BundleCostSummary({ bundleCost }: Props) {
  const fmt = (n: number) =>
    `KSh ${n.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  return (
    <div className="card p-4 space-y-3">
      <h3 className="font-semibold text-sm text-gray-700">Bundle Cost Estimate</h3>

      {/* Product line items */}
      {bundleCost.line_items.length > 0 && (
        <div className="space-y-1.5">
          {bundleCost.line_items.map(item => (
            <div key={item.product_id} className="flex justify-between text-xs text-gray-600">
              <span className="truncate pr-2">
                {item.product_name}{' '}
                <span className="text-gray-400">× {item.quantity_required}</span>
              </span>
              <span className="shrink-0 font-medium">{fmt(item.subtotal)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-gray-100 pt-2 space-y-1">
        <div className="flex justify-between text-xs text-gray-600">
          <span>Products subtotal</span>
          <span>{fmt(bundleCost.products_subtotal)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span>Stylist service fee</span>
          <span>{fmt(bundleCost.service_fee)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span>Platform fee</span>
          <span>{fmt(bundleCost.platform_fee)}</span>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-sm text-gray-900">
        <span>Total</span>
        <span className="text-primary-600">{fmt(bundleCost.total)}</span>
      </div>
    </div>
  );
}
