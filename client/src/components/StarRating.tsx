interface Props {
  /** Current rating value (1–5). */
  value: number;
  /** If true, the component is a static display. If false, it's interactive. */
  readonly?: boolean;
  /** Callback fired when user selects a star (interactive mode only). */
  onChange?: (rating: number) => void;
  /** Visual size of the stars. */
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'text-xs',
  md: 'text-base',
  lg: 'text-xl',
};

/**
 * StarRating — works in both display-only and interactive modes.
 * Interactive mode is used on the review submission form.
 */
export default function StarRating({
  value,
  readonly = true,
  onChange,
  size = 'md',
}: Props) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div
      className={`flex items-center gap-0.5 ${SIZE_CLASSES[size]}`}
      role={readonly ? 'img' : 'group'}
      aria-label={`Rating: ${value} out of 5 stars`}
    >
      {stars.map(star => {
        const filled = star <= Math.round(value);
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onChange?.(star)}
            className={[
              'transition-transform leading-none',
              filled ? 'text-yellow-400' : 'text-gray-300',
              !readonly
                ? 'hover:scale-110 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-400 rounded'
                : 'cursor-default',
            ].join(' ')}
            aria-label={readonly ? undefined : `Rate ${star} star${star !== 1 ? 's' : ''}`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
