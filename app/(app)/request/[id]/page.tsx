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
import { Copy, Check, ArrowLeft, User, MapPin, FileText, Calendar } from 'lucide-react';
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
      <div className="min-h-screen">
        <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (notFound || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">This request doesn&apos;t exist or has been removed.</p>
          <Link href="/dashboard">
            <Button variant="outline" className="border-border">Go to Dashboard</Button>
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

  if (paid) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center animate-fade-up">
          <div className="w-24 h-24 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-5 animate-[scale-in_0.3s_ease-out]">
            <Check className="w-11 h-11 text-emerald-400" strokeWidth={2.5} />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Payment Sent!</h2>
          <p className="text-muted-foreground mb-6">
            {formatCurrency(req.amountCents)} sent successfully.
          </p>
          <Link href="/dashboard">
            <Button className="font-display font-semibold">Done</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        {/* Amount hero */}
        <div className="relative bg-card border border-border rounded-2xl overflow-hidden mb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative px-8 py-10 text-center">
            <p className="text-xs font-display font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">
              Payment Request
            </p>
            <p className="font-numeric text-5xl font-bold text-foreground tracking-tight mb-3">
              {formatCurrency(req.amountCents)}
            </p>
            <StatusBadge status={req.status} />
          </div>
        </div>

        {/* Details card */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
          <div className="divide-y divide-border/50">
            <div className="px-6 py-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4 text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-display font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-0.5">From</p>
                <p className="font-semibold text-foreground">{req.senderName}</p>
                <p className="text-sm text-muted-foreground">{req.senderEmail}</p>
              </div>
            </div>

            <div className="px-6 py-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-4 h-4 text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-display font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-0.5">To</p>
                <p className="text-sm text-foreground">{req.recipientContact}</p>
              </div>
            </div>

            {req.note && (
              <div className="px-6 py-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-4 h-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-display font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-0.5">Note</p>
                  <p className="text-sm text-foreground">{req.note}</p>
                </div>
              </div>
            )}

            <div className="px-6 py-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-display font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-0.5">Created</p>
                <p className="text-sm text-foreground">{formatDate(req.createdAt)}</p>
                {isPending && !expired && (
                  <div className="mt-1"><ExpirationCountdown expiresAt={req.expiresAt} /></div>
                )}
                {req.status === 'paid' && req.paidAt && (
                  <p className="text-sm text-emerald-400 mt-1">Paid on {formatDate(req.paidAt)}</p>
                )}
                {req.status === 'declined' && (
                  <p className="text-sm text-rose-400 mt-1">Declined</p>
                )}
                {req.status === 'cancelled' && (
                  <p className="text-sm text-muted-foreground mt-1">Cancelled by sender</p>
                )}
                {(req.status === 'expired' || (isPending && expired)) && (
                  <p className="text-sm text-muted-foreground mt-1">This request has expired</p>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border/50">
            <button
              onClick={copyLink}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              {copied
                ? <Check className="w-4 h-4" />
                : <Copy className="w-4 h-4" />
              }
              {copied ? 'Copied!' : 'Copy shareable link'}
            </button>
          </div>
        </div>

        {/* Actions */}
        {!user && isPending && !expired && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <p className="text-sm text-muted-foreground mb-3">Sign in to pay or decline this request.</p>
            <Link
              href="/login"
              onClick={() => window.localStorage.setItem('redirectAfterLogin', `/request/${req.id}`)}
            >
              <Button className="w-full font-display font-semibold">Sign in</Button>
            </Link>
          </div>
        )}

        {isSender && isPending && !expired && (
          <Button
            variant="outline"
            className="w-full text-rose-400 border-rose-500/30 hover:bg-rose-500/10 hover:border-rose-500/50"
            disabled={actionLoading === 'cancel'}
            onClick={() => setConfirmAction('cancel')}
          >
            Cancel Request
          </Button>
        )}

        {isRecipient && !isSender && isPending && !expired && (() => {
          const hasSufficientFunds = wallet && wallet.balanceCents >= req.amountCents;
          return (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Your balance</span>
                <span className={`font-numeric font-bold ${hasSufficientFunds ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {wallet ? formatCurrency(wallet.balanceCents) : '—'}
                </span>
              </div>

              {hasSufficientFunds ? (
                <Button
                  className="w-full font-display font-semibold bg-emerald-500 hover:bg-emerald-500/90 text-white"
                  size="lg"
                  disabled={!!actionLoading}
                  onClick={handlePay}
                >
                  {actionLoading === 'pay' ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    `Pay ${formatCurrency(req.amountCents)}`
                  )}
                </Button>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
                  <p className="text-sm text-amber-400 mb-3">Insufficient balance.</p>
                  <Button
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-500/90 text-amber-950 font-semibold"
                    onClick={() => setAddFundsOpen(true)}
                  >
                    Add Funds
                  </Button>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full text-rose-400 border-rose-500/30 hover:bg-rose-500/10 hover:border-rose-500/50"
                disabled={!!actionLoading}
                onClick={() => setConfirmAction('decline')}
              >
                Decline
              </Button>
            </div>
          );
        })()}
      </div>

      <AddFundsDialog open={addFundsOpen} onOpenChange={setAddFundsOpen} />

      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">
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
