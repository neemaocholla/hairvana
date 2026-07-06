interface FilterOption {
  label: string;
  value: string;
}

interface Props {
  /** Category options to display as chips. */
  categories?: FilterOption[];
  selectedCategory?: string;
  onCategoryChange?: (value: string | undefined) => void;

  /** Min/max price range. */
  minPrice?: number;
  maxPrice?: number;
  onPriceChange?: (min: number | undefined, max: number | undefined) => void;

  /** Hair length options (hairstyle filter). */
  hairLengths?: FilterOption[];
  selectedHairLength?: string;
  onHairLengthChange?: (value: string | undefined) => void;

  /** Location options (stylist/vendor filter). */
  locations?: FilterOption[];
  selectedLocation?: string;
  onLocationChange?: (value: string | undefined) => void;

  /** Service type options (stylist filter). */
  serviceTypes?: FilterOption[];
  selectedServiceType?: string;
  onServiceTypeChange?: (value: string | undefined) => void;

  /** House-call toggle (stylist filter). */
  houseCallOnly?: boolean;
  onHouseCallChange?: (value: boolean) => void;

  onClear?: () => void;
}

/**
 * FilterPanel — renders filter chips for category, price range, hair length,
 * location, service type, and house-call toggle.  Each group is optional so
 * the panel is composable for different screens.
 */
export default function FilterPanel({
  categories,
  selectedCategory,
  onCategoryChange,
  hairLengths,
  selectedHairLength,
  onHairLengthChange,
  locations,
  selectedLocation,
  onLocationChange,
  serviceTypes,
  selectedServiceType,
  onServiceTypeChange,
  houseCallOnly,
  onHouseCallChange,
  onClear,
}: Props) {
  const chipClass = (active: boolean) =>
    [
      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
      active
        ? 'bg-primary-600 text-white border-primary-600'
        : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400',
    ].join(' ');

  return (
    <div className="space-y-3 py-2">
      {/* Category */}
      {categories && categories.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
            Category
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  onCategoryChange?.(opt.value === selectedCategory ? undefined : opt.value)
                }
                className={chipClass(opt.value === selectedCategory)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hair length */}
      {hairLengths && hairLengths.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
            Hair Length
          </p>
          <div className="flex flex-wrap gap-2">
            {hairLengths.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  onHairLengthChange?.(opt.value === selectedHairLength ? undefined : opt.value)
                }
                className={chipClass(opt.value === selectedHairLength)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Location */}
      {locations && locations.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
            Location
          </p>
          <div className="flex flex-wrap gap-2">
            {locations.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  onLocationChange?.(opt.value === selectedLocation ? undefined : opt.value)
                }
                className={chipClass(opt.value === selectedLocation)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Service type */}
      {serviceTypes && serviceTypes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
            Service Type
          </p>
          <div className="flex flex-wrap gap-2">
            {serviceTypes.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  onServiceTypeChange?.(
                    opt.value === selectedServiceType ? undefined : opt.value
                  )
                }
                className={chipClass(opt.value === selectedServiceType)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* House-call toggle */}
      {onHouseCallChange !== undefined && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={houseCallOnly}
            onClick={() => onHouseCallChange(!houseCallOnly)}
            className={[
              'relative w-10 h-5 rounded-full transition-colors',
              houseCallOnly ? 'bg-primary-600' : 'bg-gray-300',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                houseCallOnly ? 'translate-x-5' : 'translate-x-0',
              ].join(' ')}
            />
          </button>
          <span className="text-sm text-gray-700">House calls only</span>
        </div>
      )}

      {/* Clear button */}
      {onClear && (
        <button type="button" onClick={onClear} className="text-xs text-primary-600 underline">
          Clear all filters
        </button>
      )}
    </div>
  );
}
