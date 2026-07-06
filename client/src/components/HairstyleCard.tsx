import type { HairstyleListItem } from '@hairvana/shared';
import { Link } from 'react-router-dom';

interface Props {
  hairstyle: HairstyleListItem;
}

/** Thumbnail card for the hairstyle gallery grid. */
export default function HairstyleCard({ hairstyle }: Props) {
  const photo = hairstyle.photo_urls[0];

  return (
    <Link
      to={`/hairstyles/${hairstyle.id}`}
      className="card block hover:shadow-md transition-shadow"
    >
      {/* Thumbnail */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {photo ? (
          <img
            src={photo}
            alt={hairstyle.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
            No photo
          </div>
        )}
        {/* Category tag */}
        <span className="absolute top-2 left-2 badge bg-primary-600 text-white">
          {hairstyle.category}
        </span>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm text-gray-900 truncate">{hairstyle.name}</h3>
        <p className="text-xs text-primary-600 font-medium mt-0.5">
          From KSh {hairstyle.bundle_price_from.toLocaleString()}
        </p>
      </div>
    </Link>
  );
}
