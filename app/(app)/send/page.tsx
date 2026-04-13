'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { validateContact, validateAmountCents } from '@/lib/validations';
import { formatCurrency } from '@/lib/utils';
import { useAmountInput } from '@/hooks/useAmountInput';
import { AddFundsDialog } from '@/components/AddFundsDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import Link from 'next/link';
import { ContactPicker } from '@/components/ContactPicker';
import { ArrowLeft, Check, Send } from 'lucide-react';

interface FormErrors {
  recipient?: string;
  amount?: string;
  note?: string;
}

function SendMoneyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { wallet } = useWallet(user?.uid ?? null);
  const [recipient, setRecipient] = useState('');
  const amountInput = useAmountInput();
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const [transferState, setTransferState] = useState<'idle' | 'sending' | 'success'>('idle');

  useEffect(() => {
    const to = searchParams.get('to');
    const amount = searchParams.get('amount');
    const prefillNote = searchParams.get('note');
    if (to) setRecipient(to);
    if (amount) {
      const cents = parseInt(amount, 10);
      if (!isNaN(cents) && cents > 0) amountInput.setAmount(cents);
    }
    if (prefillNote) setNote(prefillNote.slice(0, 280));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.replace('/login');
    return null;
  }

  const balanceCents = wallet?.balanceCents ?? 0;
  const amountCents = amountInput.cents;
  const insufficientFunds = amountCents > 0 && amountCents > balanceCents;

  function validateForm(): boolean {
    const newErrors: FormErrors = {};

    const recipientTrimmed = recipient.trim();
    if (!recipientTrimmed) {
      newErrors.recipient = 'Please enter an email or phone number';
    } else if (!validateContact(recipientTrimmed)) {
      newErrors.recipient =
        'Please enter a valid email (e.g. john@example.com) or phone number (e.g. +14155552671)';
    } else if (recipientTrimmed.toLowerCase() === user!.email?.toLowerCase()) {
      newErrors.recipient = "You can't send money to yourself.";
    }

    if (amountCents === 0) {
      newErrors.amount = 'Amount must be greater than $0.00';
    } else if (!validateAmountCents(amountCents)) {
      newErrors.amount = 'Maximum amount is $10,000.00';
    } else if (amountCents > balanceCents) {
      newErrors.amount = 'Insufficient balance. Please add funds.';
    }

    if (note.length > 280) {
      newErrors.note = 'Note must be 280 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setTransferState('sending');
    try {
      const token = await auth.currentUser!.getIdToken();
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientContact: recipient.trim(),
          amountCents: amountInput.cents,
          note: note.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? 'Something went wrong. Please try again.');
        setTransferState('idle');
        return;
      }

      setTransferState('success');
      setTimeout(() => {
        toast.success(`Sent ${formatCurrency(amountCents)}!`);
        router.push('/dashboard');
      }, 2000);
    } catch {
      toast.error('Something went wrong. Please check your connection.');
      setTransferState('idle');
    } finally {
      setSubmitting(false);
    }
  }

  if (transferState !== 'idle') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          {transferState === 'sending' ? (
            <>
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Send className="w-7 h-7 text-primary animate-pulse" />
                </div>
              </div>
              <p className="font-display text-lg font-bold text-foreground">Sending {formatCurrency(amountCents)}</p>
              <p className="text-sm text-muted-foreground mt-1">to {recipient}</p>
            </>
          ) : (
            <>
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center animate-[scale-in_0.3s_ease-out]">
                <Check className="w-10 h-10 text-emerald-400" strokeWidth={2.5} />
              </div>
              <p className="font-display text-lg font-bold text-foreground">Money Sent!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {formatCurrency(amountCents)} to {recipient}
              </p>
            </>
          )}
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
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="bg-card rounded-2xl border border-border p-8">
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">Send Money</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Balance:{' '}
            <span className={`font-numeric font-semibold ${balanceCents > 0 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
              {formatCurrency(balanceCents)}
            </span>
            <button
              className="ml-2 text-primary hover:text-primary/80 text-xs font-medium transition-colors"
              onClick={() => setAddFundsOpen(true)}
            >
              Add Funds
            </button>
          </p>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Send to</label>
              <Input
                type="text"
                placeholder="email@example.com or +14155552671"
                value={recipient}
                onChange={(e) => {
                  setRecipient(e.target.value);
                  if (errors.recipient) setErrors((p) => ({ ...p, recipient: undefined }));
                }}
                className={`bg-input border-border ${errors.recipient ? 'border-destructive' : ''}`}
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  Enter an email address or E.164 phone number
                </p>
                <ContactPicker
                  userId={user.uid}
                  onSelect={(email) => {
                    setRecipient(email);
                    if (errors.recipient) setErrors((p) => ({ ...p, recipient: undefined }));
                  }}
                />
              </div>
              {errors.recipient && (
                <p className="mt-1 text-sm text-destructive">{errors.recipient}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amountInput.display}
                  onChange={(e) => {
                    amountInput.handleChange(e);
                    if (errors.amount) setErrors((p) => ({ ...p, amount: undefined }));
                  }}
                  onBlur={amountInput.handleBlur}
                  className={`pl-7 bg-input border-border font-numeric ${errors.amount || insufficientFunds ? 'border-destructive' : ''}`}
                />
              </div>
              {insufficientFunds && !errors.amount && (
                <p className="mt-1 text-sm text-amber-400">
                  Insufficient balance.{' '}
                  <button type="button" className="underline" onClick={() => setAddFundsOpen(true)}>
                    Add funds
                  </button>
                </p>
              )}
              {errors.amount && (
                <p className="mt-1 text-sm text-destructive">{errors.amount}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                Note <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Textarea
                placeholder="What's this for?"
                value={note}
                maxLength={280}
                onChange={(e) => {
                  setNote(e.target.value);
                  if (errors.note) setErrors((p) => ({ ...p, note: undefined }));
                }}
                rows={3}
                className={`resize-none bg-input border-border ${errors.note ? 'border-destructive' : ''}`}
              />
              <div className="flex justify-between mt-1">
                {errors.note ? (
                  <p className="text-sm text-destructive">{errors.note}</p>
                ) : (
                  <span />
                )}
                <span className={`text-xs ${note.length > 260 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                  {note.length}/280
                </span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full font-display font-semibold"
              size="lg"
              disabled={submitting || insufficientFunds}
            >
              {submitting ? 'Sending...' : `Send ${amountCents > 0 ? formatCurrency(amountCents) : 'Money'}`}
            </Button>
          </form>
        </div>
      </div>

      <AddFundsDialog open={addFundsOpen} onOpenChange={setAddFundsOpen} />
    </div>
  );
}

export default function SendMoneyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SendMoneyForm />
    </Suspense>
  );
}
