'use client';

import { Transfer } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export function TransferCard({
  transfer,
  currentUserEmail,
}: {
  transfer: Transfer;
  currentUserEmail: string;
}) {
  const isSent = transfer.senderEmail.toLowerCase() === currentUserEmail.toLowerCase();

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
        <div className="text-right shrink-0">
          <p className={`text-lg font-bold ${isSent ? 'text-red-600' : 'text-green-600'}`}>
            {isSent ? '-' : '+'}{formatCurrency(transfer.amountCents)}
          </p>
        </div>
      </div>
    </div>
  );
}
