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

    // Deduplicate requests (might appear in both outgoing and incoming)
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
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.replace('/login');
    return null;
  }

  const email = user.email?.toLowerCase() ?? '';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Transaction History</h1>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        ) : timeline.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p>No transactions yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {timeline.map((item) => {
              if (item.kind === 'transfer') {
                const t = item.data;
                const isSent = t.senderEmail.toLowerCase() === email;
                return (
                  <div key={`t-${t.id}`} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isSent ? 'bg-red-50' : 'bg-green-50'}`}>
                      {isSent ? <ArrowUpRight className="w-4 h-4 text-red-600" /> : <ArrowDownLeft className="w-4 h-4 text-green-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                          Transfer
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTimestamp(item.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 truncate mt-0.5">
                        {isSent ? `Sent to ${t.recipientContact}` : `Received from ${t.senderName}`}
                      </p>
                      {t.note && <p className="text-xs text-gray-500 truncate">{t.note}</p>}
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${isSent ? 'text-red-600' : 'text-green-600'}`}>
                      {isSent ? '-' : '+'}{formatCurrency(t.amountCents)}
                    </span>
                  </div>
                );
              } else {
                const r = item.data;
                const isOutgoing = r.senderId === user.uid;
                return (
                  <Link key={`r-${r.id}`} href={`/request/${r.id}`}>
                    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 hover:border-gray-200 transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isOutgoing ? 'bg-blue-50' : 'bg-purple-50'}`}>
                        {isOutgoing ? <Send className="w-4 h-4 text-blue-600" /> : <FileText className="w-4 h-4 text-purple-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                            Request
                          </span>
                          <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${statusColor(r.status)}`}>
                            {r.status}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatTimestamp(item.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 truncate mt-0.5">
                          {isOutgoing
                            ? `Requested from ${r.recipientContact}`
                            : `${r.senderName} requested`}
                        </p>
                        {r.note && <p className="text-xs text-gray-500 truncate">{r.note}</p>}
                      </div>
                      <span className="text-sm font-bold text-gray-700 shrink-0">
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
    case 'pending': return 'bg-amber-50 text-amber-700';
    case 'paid': return 'bg-green-50 text-green-700';
    case 'declined': return 'bg-red-50 text-red-700';
    case 'expired': return 'bg-gray-100 text-gray-500';
    case 'cancelled': return 'bg-gray-100 text-gray-500';
    default: return 'bg-gray-100 text-gray-500';
  }
}
