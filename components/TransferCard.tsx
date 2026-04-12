'use client';

import { Transfer } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { auth } from '@/lib/firebase/client';
import { ArrowUpRight, ArrowDownLeft, Bookmark } from 'lucide-react';
import { toast } from 'sonner';

export function TransferCard({
  transfer,
  currentUserEmail,
}: {
  transfer: Transfer;
  currentUserEmail: string;
}) {
  const isSent = transfer.senderEmail.toLowerCase() === currentUserEmail.toLowerCase();

  async function handleFavorite() {
    try {
      const token = await auth.currentUser!.getIdToken();
      const res = await fetch('/api/favorite-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'transfer',
          recipientContact: isSent ? transfer.recipientContact : transfer.senderEmail,
          recipientName: isSent ? transfer.recipientContact.split('@')[0] : transfer.senderName,
          amountCents: transfer.amountCents,
          note: transfer.note || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? 'Failed to save favorite');
        return;
      }

      toast.success('Saved to quick actions!');
    } catch {
      toast.error('Something went wrong');
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-border/80 transition-all duration-200 group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isSent
              ? 'bg-rose-500/15'
              : 'bg-emerald-500/15'
          }`}>
            {isSent ? (
              <ArrowUpRight className="w-4 h-4 text-rose-400" />
            ) : (
              <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-display font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {isSent ? 'Sent to' : 'Received from'}
            </p>
            <p className="font-semibold text-foreground truncate mt-0.5">
              {isSent ? transfer.recipientContact : transfer.senderName}
            </p>
            {!isSent && (
              <p className="text-xs text-muted-foreground truncate">{transfer.senderEmail}</p>
            )}
            {transfer.note && (
              <p className="text-sm text-muted-foreground mt-1 truncate">{transfer.note}</p>
            )}
            <p className="text-xs text-muted-foreground/60 mt-1">{formatDate(transfer.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <p className={`font-numeric text-lg font-bold ${isSent ? 'text-rose-400' : 'text-emerald-400'}`}>
            {isSent ? '-' : '+'}{formatCurrency(transfer.amountCents)}
          </p>
          <button
            onClick={handleFavorite}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10 transition-colors text-xs font-semibold opacity-0 group-hover:opacity-100"
            title="Save as quick action"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}
