'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client';
import { PaymentRequest } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import { ExpirationCountdown } from './ExpirationCountdown';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

type CardVariant = 'outgoing' | 'incoming';

async function callAction(requestId: string, action: 'pay' | 'decline' | 'cancel') {
  const token = await auth.currentUser!.getIdToken();
  const res = await fetch(`/api/requests/${requestId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? 'Something went wrong.');
  }
}

export function RequestCard({ request, variant }: { request: PaymentRequest; variant: CardVariant }) {
  const router = useRouter();
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'decline' | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const isPending = request.status === 'pending';

  async function handleAction(action: 'pay' | 'decline' | 'cancel') {
    setLoading(action);
    try {
      await callAction(request.id, action);
      const messages = { pay: 'Payment sent!', decline: 'Request declined.', cancel: 'Request cancelled.' };
      toast.success(messages[action]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(null);
      setConfirmAction(null);
    }
  }

  return (
    <>
      <div
        className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer"
        onClick={() => router.push(`/request/${request.id}`)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900 truncate">
                {variant === 'outgoing' ? request.recipientContact : request.senderName}
              </span>
              <StatusBadge status={request.status} />
            </div>
            {variant === 'incoming' && (
              <p className="text-xs text-gray-500 truncate mt-0.5">{request.senderEmail}</p>
            )}
            {request.note && (
              <p className="text-sm text-gray-600 mt-1 truncate">{request.note}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-gray-400">{formatDate(request.createdAt)}</span>
              {isPending && <ExpirationCountdown expiresAt={request.expiresAt} />}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-gray-900">{formatCurrency(request.amountCents)}</p>
          </div>
        </div>

        {isPending && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50" onClick={(e) => e.stopPropagation()}>
            {variant === 'outgoing' && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                disabled={!!loading}
                onClick={() => setConfirmAction('cancel')}
              >
                Cancel
              </Button>
            )}
            {variant === 'incoming' && (
              <>
                <Button size="sm" disabled={!!loading} onClick={() => handleAction('pay')}>
                  {loading === 'pay' ? 'Processing...' : `Pay ${formatCurrency(request.amountCents)}`}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  disabled={!!loading}
                  onClick={() => setConfirmAction('decline')}
                >
                  Decline
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === 'cancel' ? 'Cancel this request?' : 'Decline this request?'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === 'cancel'
                ? 'The recipient will no longer be able to pay this request. This cannot be undone.'
                : 'The sender will be notified that you declined their request. This cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Go back</Button>
            <Button
              variant="destructive"
              disabled={!!loading}
              onClick={() => confirmAction && handleAction(confirmAction)}
            >
              {loading ? 'Processing...' : confirmAction === 'cancel' ? 'Yes, cancel it' : 'Yes, decline it'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
