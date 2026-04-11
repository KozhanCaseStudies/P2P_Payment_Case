'use client';

import { Transfer, PaymentRequest } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface SummaryStatsProps {
  transfers: Transfer[];
  outgoingRequests: PaymentRequest[];
  incomingRequests: PaymentRequest[];
  currentUserEmail: string;
}

function getMonthAgoMs(): number {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.getTime();
}

export function SummaryStats({
  transfers,
  outgoingRequests,
  incomingRequests,
  currentUserEmail,
}: SummaryStatsProps) {
  const monthAgo = getMonthAgoMs();
  const email = currentUserEmail.toLowerCase();

  // Transfer-based income/expense
  let allTimeIn = 0;
  let allTimeOut = 0;
  let monthIn = 0;
  let monthOut = 0;

  for (const t of transfers) {
    const isSent = t.senderEmail.toLowerCase() === email;
    const ts = t.createdAt.toMillis();
    if (isSent) {
      allTimeOut += t.amountCents;
      if (ts >= monthAgo) monthOut += t.amountCents;
    } else {
      allTimeIn += t.amountCents;
      if (ts >= monthAgo) monthIn += t.amountCents;
    }
  }

  // Request-based: paid outgoing = money received, paid incoming = money sent
  for (const r of outgoingRequests) {
    if (r.status === 'paid') {
      allTimeIn += r.amountCents;
      if (r.paidAt && r.paidAt.toMillis() >= monthAgo) monthIn += r.amountCents;
    }
  }

  for (const r of incomingRequests) {
    if (r.status === 'paid') {
      allTimeOut += r.amountCents;
      if (r.paidAt && r.paidAt.toMillis() >= monthAgo) monthOut += r.amountCents;
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard
        label="Last 30 Days"
        incoming={monthIn}
        outgoing={monthOut}
      />
      <StatCard
        label="All Time"
        incoming={allTimeIn}
        outgoing={allTimeOut}
      />
    </div>
  );
}

function StatCard({
  label,
  incoming,
  outgoing,
}: {
  label: string;
  incoming: number;
  outgoing: number;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">{label}</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-green-600" />
            <span className="text-xs text-gray-500">Received</span>
          </div>
          <span className="text-sm font-semibold text-green-600">
            {formatCurrency(incoming)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs text-gray-500">Sent</span>
          </div>
          <span className="text-sm font-semibold text-red-500">
            {formatCurrency(outgoing)}
          </span>
        </div>
      </div>
    </div>
  );
}
