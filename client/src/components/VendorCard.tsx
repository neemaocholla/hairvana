import type { VendorListItem } from '@hairvana/shared';
import { Link } from 'react-router-dom';
import StarRating from './StarRating.tsx';

interface Props {
  vendor: VendorListItem;
}

/** Card used in the vendor list screen. */
export default function VendorCard({ vendor }: Props) {
  return (
    <Link
      to={`/vendors/${vendor.id}`}
      className="card flex gap-3 p-3 hover:shadow-md transition-shadow"
    >
      {/* Logo */}
      <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
        {vendor.logo_url ? (
          <img
            src={vendor.logo_url}
            alt={vendor.business_name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">
            🏪
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-gray-900 truncate">{vendor.business_name}</h3>
          {vendor.is_verified && (
            <span className="badge bg-blue-100 text-blue-700 shrink-0" title="Verified vendor">
              ✓ Verified
            </span>
          )}
        </div>

        <p className="text-xs text-gray-500 truncate mt-0.5">{vendor.location}</p>

        <StarRating value={vendor.average_rating} readonly size="sm" />

        <p className="text-xs text-gray-400 mt-0.5 truncate">
          {vendor.product_categories.slice(0, 3).join(' · ')}
        </p>
      </div>
    </Link>
  );
}
