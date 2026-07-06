/**
 * OfflineBanner — displayed at the top of the screen whenever
 * `navigator.onLine === false`.  Requirement 12.5.
 */
export default function OfflineBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2
                 bg-yellow-400 text-yellow-900 text-sm font-medium py-2 px-4"
    >
      {/* Offline icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M6.343 6.343a9 9 0 000 12.728m2.829-2.829a5 5 0 000-7.072M12 12h.01"
        />
      </svg>
      You're offline — showing cached content
    </div>
  );
}
