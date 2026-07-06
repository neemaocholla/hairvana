import { useState } from 'react';

interface Props {
  images: string[];
  alt: string;
}

/**
 * ImageGallery — lazy-loaded image carousel.
 * Uses the native `loading="lazy"` attribute for data efficiency on 3G.
 */
export default function ImageGallery({ images, alt }: Props) {
  const [current, setCurrent] = useState(0);

  if (images.length === 0) {
    return (
      <div className="aspect-video bg-gray-100 flex items-center justify-center text-gray-400 text-sm rounded-xl">
        No photos available
      </div>
    );
  }

  const prev = () => setCurrent(i => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setCurrent(i => (i === images.length - 1 ? 0 : i + 1));

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-100">
      {/* Main image */}
      <img
        key={images[current]}
        src={images[current]}
        alt={`${alt} — photo ${current + 1} of ${images.length}`}
        loading="lazy"
        className="w-full h-full object-cover"
      />

      {/* Navigation — only shown when there are multiple images */}
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full
                       w-8 h-8 flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            ‹
          </button>
          <button
            onClick={next}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full
                       w-8 h-8 flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            ›
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Go to photo ${i + 1}`}
                className={[
                  'w-1.5 h-1.5 rounded-full transition-all',
                  i === current ? 'bg-white scale-125' : 'bg-white/50',
                ].join(' ')}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
