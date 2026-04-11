'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { validateContact, validateAmountCents } from '@/lib/validations';
import { parseCurrencyInput, formatCurrency } from '@/lib/utils';
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

export default function SendMoneyPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { wallet } = useWallet(user?.uid ?? null);
  const [recipient, setRecipient] = useState('');
  const [amountDisplay, setAmountDisplay] = useState('');
  const [amountCents, setAmountCents] = useState(0);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const [transferState, setTransferState] = useState<'idle' | 'sending' | 'success'>('idle');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.replace('/login');
    return null;
  }

  const balanceCents = wallet?.balanceCents ?? 0;
  const insufficientFunds = amountCents > 0 && amountCents > balanceCents;

  function validateForm(): boolean {
    const newErrors: FormErrors = {};

    if (!recipient.trim()) {
      newErrors.recipient = 'Please enter an email or phone number';
    } else if (!validateContact(recipient.trim())) {
      newErrors.recipient =
        'Please enter a valid email (e.g. john@example.com) or phone number (e.g. +14155552671)';
    } else if (recipient.trim().toLowerCase() === user!.email?.toLowerCase()) {
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

  function handleAmountBlur() {
    if (amountCents > 0) {
      setAmountDisplay(formatCurrency(amountCents).replace('$', ''));
    }
  }

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setAmountDisplay(raw);
    setAmountCents(parseCurrencyInput(raw));
    if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
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
          amountCents,
          note: note.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? 'Something went wrong. Please try again.');
        setTransferState('idle');
        return;
      }

      // Show success animation for 2 seconds, then redirect
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          {transferState === 'sending' ? (
            <>
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
                <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Send className="w-7 h-7 text-blue-600 animate-pulse" />
                </div>
              </div>
              <p className="text-lg font-semibold text-gray-900">Sending {formatCurrency(amountCents)}</p>
              <p className="text-sm text-gray-500 mt-1">to {recipient}</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center animate-[scale-in_0.3s_ease-out]">
                <Check className="w-10 h-10 text-green-600" strokeWidth={3} />
              </div>
              <p className="text-lg font-semibold text-gray-900">Money Sent!</p>
              <p className="text-sm text-gray-500 mt-1">
                {formatCurrency(amountCents)} to {recipient}
              </p>
            </>
          )}
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
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Send Money</h1>
          <p className="text-sm text-gray-500 mb-6">
            Balance: <span className={`font-semibold ${balanceCents > 0 ? 'text-green-700' : 'text-gray-500'}`}>
              {formatCurrency(balanceCents)}
            </span>
            <button
              className="ml-2 text-blue-600 hover:underline text-xs"
              onClick={() => setAddFundsOpen(true)}
            >
              Add Funds
            </button>
          </p>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Send to</label>
              <Input
                type="text"
                placeholder="email@example.com or +14155552671"
                value={recipient}
                onChange={(e) => {
                  setRecipient(e.target.value);
                  if (errors.recipient) setErrors((p) => ({ ...p, recipient: undefined }));
                }}
                className={errors.recipient ? 'border-red-500' : ''}
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-400">
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
                <p className="mt-1 text-sm text-red-600">{errors.recipient}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amountDisplay}
                  onChange={handleAmountChange}
                  onBlur={handleAmountBlur}
                  className={`pl-7 ${errors.amount || insufficientFunds ? 'border-red-500' : ''}`}
                />
              </div>
              {insufficientFunds && !errors.amount && (
                <p className="mt-1 text-sm text-amber-600">
                  Insufficient balance.{' '}
                  <button type="button" className="underline" onClick={() => setAddFundsOpen(true)}>
                    Add funds
                  </button>
                </p>
              )}
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <Textarea
                placeholder="What's this for?"
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  if (errors.note) setErrors((p) => ({ ...p, note: undefined }));
                }}
                rows={3}
                className={`resize-none ${errors.note ? 'border-red-500' : ''}`}
              />
              <div className="flex justify-between mt-1">
                {errors.note ? (
                  <p className="text-sm text-red-600">{errors.note}</p>
                ) : (
                  <span />
                )}
                <span className={`text-xs ${note.length > 260 ? 'text-amber-600' : 'text-gray-400'}`}>
                  {note.length}/280
                </span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
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
