'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useOutgoingRequests, useIncomingRequests } from '@/hooks/useRequests';
import { useTransfers } from '@/hooks/useTransfers';
import { formatCurrency } from '@/lib/utils';
import { PaymentRequest, Transfer } from '@/types';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, FileText, Send } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

type TimelineItem =
  | { kind: 'transfer'; data: Transfer; timestamp: number }
  | { kind: 'request'; data: PaymentRequest; timestamp: number };

export default function HistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const { requests: outgoing, loading: outLoading } = useOutgoingRequests(user?.uid ?? null);
  const { requests: incoming, loading: inLoading } = useIncomingRequests(
    user?.email ?? null,
    user?.uid ?? null
  );
  const { transfers, loading: transfersLoading } = useTransfers(
    user?.email ?? null,
    user?.uid ?? null
  );

  const timeline = useMemo(() => {
    const items: TimelineItem[] = [];

    for (const t of transfers) {
      items.push({ kind: 'transfer', data: t, timestamp: t.createdAt.toMillis() });
    }
    for (const r of [...outgoing, ...incoming]) {
      items.push({ kind: 'request', data: r, timestamp: r.createdAt.toMillis() });
    }

    const seen = new Set<string>();
    const unique = items.filter((item) => {
      const id = item.kind === 'transfer' ? `t-${item.data.id}` : `r-${item.data.id}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    return unique.sort((a, b) => b.timestamp - a.timestamp);
  }, [transfers, outgoing, incoming]);

  const loading = authLoading || outLoading || inLoading || transfersLoading;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.replace('/login');
    return null;
  }

  const email = user.email?.toLowerCase() ?? '';

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <h1 className="font-display text-2xl font-bold text-foreground mb-6">Transaction History</h1>

        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        ) : timeline.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">No transactions yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {timeline.map((item) => {
              if (item.kind === 'transfer') {
                const t = item.data;
                const isSent = t.senderEmail.toLowerCase() === email;
                return (
                  <div
                    key={`t-${t.id}`}
                    className="bg-card rounded-xl border border-border p-4 flex items-center gap-3"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isSent ? 'bg-rose-500/15' : 'bg-emerald-500/15'
                    }`}>
                      {isSent
                        ? <ArrowUpRight className="w-4 h-4 text-rose-400" />
                        : <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          Transfer
                        </span>
                        <span className="text-xs text-muted-foreground/60">
                          {formatTimestamp(item.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground truncate mt-0.5">
                        {isSent ? `Sent to ${t.recipientContact}` : `Received from ${t.senderName}`}
                      </p>
                      {t.note && <p className="text-xs text-muted-foreground truncate">{t.note}</p>}
                    </div>
                    <span className={`font-numeric text-sm font-bold shrink-0 ${isSent ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {isSent ? '-' : '+'}{formatCurrency(t.amountCents)}
                    </span>
                  </div>
                );
              } else {
                const r = item.data;
                const isOutgoing = r.senderId === user.uid;
                return (
                  <Link key={`r-${r.id}`} href={`/request/${r.id}`}>
                    <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 hover:border-border/80 hover:bg-accent/30 transition-all duration-200 cursor-pointer">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isOutgoing ? 'bg-blue-500/15' : 'bg-purple-500/15'
                      }`}>
                        {isOutgoing
                          ? <Send className="w-4 h-4 text-blue-400" />
                          : <FileText className="w-4 h-4 text-purple-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            Request
                          </span>
                          <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${statusColor(r.status)}`}>
                            {r.status}
                          </span>
                          <span className="text-xs text-muted-foreground/60">
                            {formatTimestamp(item.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground truncate mt-0.5">
                          {isOutgoing
                            ? `Requested from ${r.recipientContact}`
                            : `${r.senderName} requested`}
                        </p>
                        {r.note && <p className="text-xs text-muted-foreground truncate">{r.note}</p>}
                      </div>
                      <span className="font-numeric text-sm font-bold text-foreground shrink-0">
                        {formatCurrency(r.amountCents)}
                      </span>
                    </div>
                  </Link>
                );
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - ms) / 86400000);

  if (diffDays === 0) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function statusColor(status: string): string {
  switch (status) {
    case 'pending': return 'bg-amber-500/15 text-amber-400';
    case 'paid': return 'bg-emerald-500/15 text-emerald-400';
    case 'declined': return 'bg-rose-500/15 text-rose-400';
    case 'expired': return 'bg-muted text-muted-foreground';
    case 'cancelled': return 'bg-muted text-muted-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
}
