import type { BookingStatus } from '@hairvana/shared';

interface Props {
  status: BookingStatus;
}

const STATUS_STYLES: Record<BookingStatus, string> = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Confirmed: 'bg-green-100 text-green-800',
  Declined: 'bg-red-100 text-red-800',
  Completed: 'bg-blue-100 text-blue-800',
  Cancelled: 'bg-gray-100 text-gray-600',
};

/** Colour-coded badge for booking status. */
export default function BookingStatusBadge({ status }: Props) {
  return (
    <span className={`badge ${STATUS_STYLES[status]}`} aria-label={`Status: ${status}`}>
      {status}
    </span>
  );
}
