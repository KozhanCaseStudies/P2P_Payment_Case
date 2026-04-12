'use client';

import { FavoriteTransaction } from '@/types';
import { useFavoriteTransactions } from '@/hooks/useFavoriteTransactions';
import { formatCurrency } from '@/lib/utils';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { Zap, Send, FileText, X } from 'lucide-react';
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
      <div className="flex items-center gap-2 mb-2.5">
        <Zap className="w-3.5 h-3.5 text-primary" />
        <h3 className="text-[10px] font-display font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Quick Actions
        </h3>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
        {favorites.map((fav) => (
          <div
            key={fav.id}
            className="relative group flex-shrink-0 bg-card border border-border rounded-xl p-3.5 w-44 hover:border-primary/30 hover:bg-accent active:scale-[0.97] transition-all duration-200 cursor-pointer"
            onClick={() => handleRepeat(fav)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); handleRemove(fav.id); }}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-rose-400 p-0.5 rounded"
              title="Remove"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="flex items-center gap-1.5 mb-2">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                fav.type === 'transfer' ? 'bg-primary/15' : 'bg-purple-500/15'
              }`}>
                {fav.type === 'transfer' ? (
                  <Send className="w-3 h-3 text-primary" />
                ) : (
                  <FileText className="w-3 h-3 text-purple-400" />
                )}
              </div>
              <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
                {fav.type === 'transfer' ? 'Send' : 'Request'}
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground truncate">{fav.recipientName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{fav.recipientContact}</p>
            <p className="font-numeric text-sm font-bold text-foreground mt-1.5">{formatCurrency(fav.amountCents)}</p>
            {fav.note && (
              <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">{fav.note}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
