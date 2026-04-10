import { Badge } from '@/components/ui/badge';
import { RequestStatus } from '@/types';

const config: Record<RequestStatus, { label: string; className: string }> = {
  pending:   { label: 'Pending',   className: 'bg-amber-100 text-amber-800 border-amber-200' },
  paid:      { label: 'Paid',      className: 'bg-green-100 text-green-800 border-green-200' },
  declined:  { label: 'Declined',  className: 'bg-red-100 text-red-800 border-red-200' },
  expired:   { label: 'Expired',   className: 'bg-gray-100 text-gray-600 border-gray-200' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const { label, className } = config[status];
  return (
    <Badge variant="outline" className={`text-xs font-medium ${className}`}>
      {label}
    </Badge>
  );
}
