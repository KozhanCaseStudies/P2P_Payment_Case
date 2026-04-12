'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase/client';
import { formatCurrency } from '@/lib/utils';
import { useAmountInput } from '@/hooks/useAmountInput';
import { validateAmountCents } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const PRESETS = [1000, 5000, 10000, 50000]; // $10, $50, $100, $500

export function AddFundsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const customInput = useAmountInput();
  const [loading, setLoading] = useState(false);

  async function addFunds(amountCents: number) {
    if (!validateAmountCents(amountCents)) {
      toast.error('Amount must be between $0.01 and $10,000.00');
      return;
    }

    setLoading(true);
    try {
      const token = await auth.currentUser!.getIdToken();
      const res = await fetch('/api/wallet/add-funds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amountCents }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? 'Something went wrong.');
        return;
      }

      const data = await res.json();
      toast.success(`Added ${formatCurrency(amountCents)} to your wallet`);
      customInput.setAmount(0);
      onOpenChange(false);
    } catch {
      toast.error('Something went wrong. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display">Add Funds</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                className="h-12 font-numeric text-base font-semibold border-border hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-colors"
                disabled={loading}
                onClick={() => addFunds(amount)}
              >
                {formatCurrency(amount)}
              </Button>
            ))}
          </div>

          <div className="relative flex items-center gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Custom amount"
                value={customInput.display}
                onChange={customInput.handleChange}
                onBlur={customInput.handleBlur}
                className="pl-7 bg-input border-border font-numeric"
                disabled={loading}
              />
            </div>
            <Button
              disabled={loading || customInput.cents === 0}
              onClick={() => addFunds(customInput.cents)}
              className="font-display font-semibold"
            >
              {loading ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
