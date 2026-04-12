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
      <StatCard label="Last 30 Days" incoming={monthIn} outgoing={monthOut} />
      <StatCard label="All Time" incoming={allTimeIn} outgoing={allTimeOut} />
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
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <p className="text-[10px] font-display font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </p>
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <TrendingDown className="w-3 h-3 text-emerald-400" />
            </div>
            <span className="text-xs text-muted-foreground">In</span>
          </div>
          <span className="font-numeric text-sm font-bold text-emerald-400">
            {formatCurrency(incoming)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-rose-500/15 flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-rose-400" />
            </div>
            <span className="text-xs text-muted-foreground">Out</span>
          </div>
          <span className="font-numeric text-sm font-bold text-rose-400">
            {formatCurrency(outgoing)}
          </span>
        </div>
      </div>
    </div>
  );
}
