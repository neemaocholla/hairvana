import type { StylistListItem } from '@hairvana/shared';
import { Link } from 'react-router-dom';
import StarRating from './StarRating.tsx';

interface Props {
  stylist: StylistListItem;
}

/** Card used in the stylist list screen. */
export default function StylistCard({ stylist }: Props) {
  return (
    <Link
      to={`/stylists/${stylist.id}`}
      className="card flex gap-3 p-3 hover:shadow-md transition-shadow"
    >
      {/* Avatar */}
      <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-100">
        {stylist.photo_url ? (
          <img
            src={stylist.photo_url}
            alt={stylist.full_name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
            👤
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm text-gray-900 truncate">{stylist.full_name}</h3>
          {stylist.house_call_offered && (
            <span className="badge bg-green-100 text-green-700 shrink-0" title="Offers house calls">
              🏠 House Call
            </span>
          )}
        </div>

        <p className="text-xs text-gray-500 truncate mt-0.5">{stylist.location}</p>

        <div className="flex items-center gap-2 mt-1">
          <StarRating value={stylist.average_rating} readonly size="sm" />
          <span className="text-xs text-gray-500">({stylist.review_count})</span>
        </div>

        <p className="text-xs text-primary-600 font-medium mt-1">
          From KSh {stylist.base_price.toLocaleString()}
        </p>
      </div>
    </Link>
  );
}
