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
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            isSent ? 'bg-red-50' : 'bg-green-50'
          }`}>
            {isSent ? (
              <ArrowUpRight className="w-4 h-4 text-red-600" />
            ) : (
              <ArrowDownLeft className="w-4 h-4 text-green-600" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {isSent ? 'Sent to' : 'Received from'}
              </span>
            </div>
            <p className="font-medium text-gray-900 truncate mt-0.5">
              {isSent ? transfer.recipientContact : transfer.senderName}
            </p>
            {!isSent && (
              <p className="text-xs text-gray-500 truncate">{transfer.senderEmail}</p>
            )}
            {transfer.note && (
              <p className="text-sm text-gray-600 mt-1 truncate">{transfer.note}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">{formatDate(transfer.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <p className={`text-lg font-bold ${isSent ? 'text-red-600' : 'text-green-600'}`}>
            {isSent ? '-' : '+'}{formatCurrency(transfer.amountCents)}
          </p>
          <button
            onClick={handleFavorite}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors text-xs font-medium"
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
