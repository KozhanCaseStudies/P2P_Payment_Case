'use client';

import { FavoriteTransaction } from '@/types';
import { useFavoriteTransactions } from '@/hooks/useFavoriteTransactions';
import { formatCurrency } from '@/lib/utils';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { Repeat, Send, FileText, X } from 'lucide-react';
import { toast } from 'sonner';

export function QuickActions({ userId }: { userId: string }) {
  const { favorites, loading } = useFavoriteTransactions(userId);
  const router = useRouter();

  if (loading || favorites.length === 0) return null;

  function handleRepeat(fav: FavoriteTransaction) {
    const params = new URLSearchParams({
      to: fav.recipientContact,
      amount: String(fav.amountCents),
      ...(fav.note ? { note: fav.note } : {}),
    });

    if (fav.type === 'transfer') {
      router.push(`/send?${params.toString()}`);
    } else {
      router.push(`/request/new?${params.toString()}`);
    }
  }

  async function handleRemove(id: string) {
    try {
      const token = await auth.currentUser!.getIdToken();
      await fetch(`/api/favorite-transactions?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Removed from quick actions');
    } catch {
      toast.error('Failed to remove');
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Repeat className="w-3.5 h-3.5 text-gray-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Quick Actions</h3>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {favorites.map((fav) => (
          <div
            key={fav.id}
            className="relative group flex-shrink-0 bg-white border border-gray-100 rounded-xl p-3 w-44 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer"
            onClick={() => handleRepeat(fav)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); handleRemove(fav.id); }}
              className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 p-0.5"
              title="Remove"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                fav.type === 'transfer' ? 'bg-blue-50' : 'bg-purple-50'
              }`}>
                {fav.type === 'transfer' ? (
                  <Send className="w-2.5 h-2.5 text-blue-600" />
                ) : (
                  <FileText className="w-2.5 h-2.5 text-purple-600" />
                )}
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                {fav.type === 'transfer' ? 'Send' : 'Request'}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-900 truncate">{fav.recipientName}</p>
            <p className="text-xs text-gray-500 truncate">{fav.recipientContact}</p>
            <p className="text-sm font-bold text-gray-900 mt-1">{formatCurrency(fav.amountCents)}</p>
            {fav.note && (
              <p className="text-[11px] text-gray-400 truncate mt-0.5">{fav.note}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
