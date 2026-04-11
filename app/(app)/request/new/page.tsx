'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { validateContact, validateAmountCents } from '@/lib/validations';
import { parseCurrencyInput, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import Link from 'next/link';
import { ContactPicker } from '@/components/ContactPicker';
import { ArrowLeft } from 'lucide-react';

interface FormErrors {
  recipient?: string;
  amount?: string;
  note?: string;
}

export default function NewRequestPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [recipient, setRecipient] = useState('');
  const [amountDisplay, setAmountDisplay] = useState('');
  const [amountCents, setAmountCents] = useState(0);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

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

  function validateForm(): boolean {
    const newErrors: FormErrors = {};

    if (!recipient.trim()) {
      newErrors.recipient = 'Please enter an email or phone number';
    } else if (!validateContact(recipient.trim())) {
      newErrors.recipient =
        'Please enter a valid email (e.g. john@example.com) or phone number (e.g. +14155552671)';
    } else if (recipient.trim().toLowerCase() === user!.email?.toLowerCase()) {
      newErrors.recipient = "You can't request money from yourself.";
    }

    if (amountCents === 0) {
      newErrors.amount = 'Amount must be greater than $0.00';
    } else if (!validateAmountCents(amountCents)) {
      newErrors.amount = 'Maximum request amount is $10,000.00';
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
    try {
      const token = await auth.currentUser!.getIdToken();
      const res = await fetch('/api/requests', {
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
        return;
      }

      toast.success('Request sent!');
      router.push('/dashboard');
    } catch {
      toast.error('Something went wrong. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
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
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Request Money</h1>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Request from
              </label>
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
                  className={`pl-7 ${errors.amount ? 'border-red-500' : ''}`}
                />
              </div>
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

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Request'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
