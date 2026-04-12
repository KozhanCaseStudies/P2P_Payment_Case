import { Badge } from '@/components/ui/badge';
import { RequestStatus } from '@/types';

const config: Record<RequestStatus, { label: string; className: string }> = {
  pending:   { label: 'Pending',   className: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  paid:      { label: 'Paid',      className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  declined:  { label: 'Declined',  className: 'bg-rose-500/15 text-rose-400 border-rose-500/20' },
  expired:   { label: 'Expired',   className: 'bg-muted text-muted-foreground border-border' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground border-border' },
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const { label, className } = config[status];
  return (
    <Badge variant="outline" className={`text-xs font-medium ${className}`}>
      {label}
    </Badge>
  );
}
