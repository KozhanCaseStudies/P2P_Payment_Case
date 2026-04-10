'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client';
import { getRequest } from '@/lib/firebase/requests';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { PaymentRequest } from '@/types';
import { AddFundsDialog } from '@/components/AddFundsDialog';
import { formatCurrency, formatDate, isExpired } from '@/lib/utils';
import { StatusBadge } from '@/components/StatusBadge';
import { ExpirationCountdown } from '@/components/ExpirationCountdown';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Copy, Check, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'decline' | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const { wallet } = useWallet(user?.uid ?? null);

  useEffect(() => {
    getRequest(id).then((r) => {
      if (!r) setNotFound(true);
      else setRequest(r);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (notFound || !request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">This request doesn&apos;t exist or has been removed.</p>
          <Link href="/dashboard">
            <Button variant="outline">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const req = request;
  const expired = isExpired(req.expiresAt);
  const isSender = user?.uid === req.senderId;
  const isRecipient =
    user?.uid === req.recipientUid ||
    user?.email?.toLowerCase() === req.recipientContact.toLowerCase();
  const isPending = req.status === 'pending';

  async function callAction(action: 'pay' | 'decline' | 'cancel') {
    setActionLoading(action);
    try {
      const token = await auth.currentUser!.getIdToken();
      const res = await fetch(`/api/requests/${req.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Something went wrong.');
      }

      if (action === 'pay') {
        setPaid(true);
      } else {
        toast.success(action === 'cancel' ? 'Request cancelled.' : 'Request declined.');
        router.push('/dashboard');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  }

  // Payment simulation: 2.5s delay then API call
  async function handlePay() {
    setActionLoading('pay');
    try {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const token = await auth.currentUser!.getIdToken();
      const res = await fetch(`/api/requests/${req.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'pay' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Payment failed. Please try again.');
      }
      setPaid(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(req.shareableLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Payment success state
  if (paid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Sent!</h2>
          <p className="text-gray-500 mb-6">
            Payment of {formatCurrency(req.amountCents)} sent successfully!
          </p>
          <Link href="/dashboard">
            <Button>Done</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Amount header */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-8 py-10 text-center text-white">
            <p className="text-blue-200 text-sm mb-1">Payment Request</p>
            <p className="text-5xl font-bold tracking-tight">{formatCurrency(req.amountCents)}</p>
            <div className="mt-3">
              <StatusBadge status={req.status} />
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">From</p>
              <p className="font-medium text-gray-900">{req.senderName}</p>
              <p className="text-sm text-gray-500">{req.senderEmail}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">To</p>
              <p className="text-sm text-gray-900">{req.recipientContact}</p>
            </div>

            {req.note && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Note</p>
                <p className="text-sm text-gray-900">{req.note}</p>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Created</p>
              <p className="text-sm text-gray-900">{formatDate(req.createdAt)}</p>
              {isPending && !expired && (
                <div className="mt-1"><ExpirationCountdown expiresAt={req.expiresAt} /></div>
              )}
              {req.status === 'paid' && req.paidAt && (
                <p className="text-sm text-green-600 mt-1">Paid on {formatDate(req.paidAt)}</p>
              )}
              {req.status === 'declined' && (
                <p className="text-sm text-red-500 mt-1">Declined</p>
              )}
              {req.status === 'cancelled' && (
                <p className="text-sm text-gray-500 mt-1">Cancelled by sender</p>
              )}
              {(req.status === 'expired' || (isPending && expired)) && (
                <p className="text-sm text-gray-500 mt-1">This request has expired</p>
              )}
            </div>

            <button
              onClick={copyLink}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy shareable link'}
            </button>

            {/* Unauthenticated user CTA */}
            {!user && isPending && !expired && (
              <div className="pt-2">
                <p className="text-sm text-gray-500 mb-3">Sign in to pay or decline this request.</p>
                <Link
                  href="/login"
                  onClick={() => window.localStorage.setItem('redirectAfterLogin', `/request/${req.id}`)}
                >
                  <Button className="w-full">Sign in</Button>
                </Link>
              </div>
            )}

            {/* Sender: cancel */}
            {isSender && isPending && !expired && (
              <Button
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
                disabled={actionLoading === 'cancel'}
                onClick={() => setConfirmAction('cancel')}
              >
                Cancel Request
              </Button>
            )}

            {/* Recipient: pay + decline */}
            {isRecipient && !isSender && isPending && !expired && (() => {
              const hasSufficientFunds = wallet && wallet.balanceCents >= req.amountCents;
              return (
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex items-center justify-between text-sm px-1">
                    <span className="text-gray-500">Your balance:</span>
                    <span className={`font-semibold ${hasSufficientFunds ? 'text-green-700' : 'text-red-600'}`}>
                      {wallet ? formatCurrency(wallet.balanceCents) : '...'}
                    </span>
                  </div>
                  {hasSufficientFunds ? (
                    <Button
                      className="w-full"
                      size="lg"
                      disabled={!!actionLoading}
                      onClick={handlePay}
                    >
                      {actionLoading === 'pay' ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Processing payment...
                        </span>
                      ) : (
                        `Pay ${formatCurrency(req.amountCents)}`
                      )}
                    </Button>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                      <p className="text-sm text-amber-800 mb-2">Insufficient balance. Please add funds.</p>
                      <Button size="sm" onClick={() => setAddFundsOpen(true)}>
                        Add Funds
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    disabled={!!actionLoading}
                    onClick={() => setConfirmAction('decline')}
                  >
                    Decline
                  </Button>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      <AddFundsDialog open={addFundsOpen} onOpenChange={setAddFundsOpen} />

      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === 'cancel' ? 'Cancel this request?' : 'Decline this request?'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === 'cancel'
                ? 'The recipient will no longer be able to pay this request. This cannot be undone.'
                : 'The sender will be notified that you declined. This cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Go back</Button>
            <Button
              variant="destructive"
              disabled={!!actionLoading}
              onClick={() => confirmAction && callAction(confirmAction)}
            >
              {actionLoading ? 'Processing...' : confirmAction === 'cancel' ? 'Yes, cancel it' : 'Yes, decline it'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
