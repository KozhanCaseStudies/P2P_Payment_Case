import { useState } from 'react';
import { parseCurrencyInput } from '@/lib/utils';

/**
 * Manages a currency amount input field.
 * - Strips all non-numeric characters in real-time
 * - Allows only one decimal point
 * - Enforces max 2 decimal places
 * - Formats to 2dp on blur (e.g. "5" → "5.00")
 * - Clears display on blur when value is 0
 */
export function useAmountInput(initialCents = 0) {
  const [display, setDisplay] = useState<string>(
    initialCents > 0 ? (initialCents / 100).toFixed(2) : ''
  );
  const [cents, setCents] = useState<number>(initialCents);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value;

    // 1. Strip everything except digits and decimal point
    raw = raw.replace(/[^\d.]/g, '');

    // 2. Allow only one decimal point
    const firstDot = raw.indexOf('.');
    if (firstDot !== -1) {
      raw =
        raw.slice(0, firstDot + 1) +
        raw.slice(firstDot + 1).replace(/\./g, '');
      // 3. Max 2 decimal places
      raw = raw.slice(0, firstDot + 3);
    }

    // 4. Disallow leading zeros before a digit (e.g. "007" → "7") but allow "0."
    if (raw.length > 1 && raw[0] === '0' && raw[1] !== '.') {
      raw = raw.replace(/^0+/, '') || '';
    }

    setDisplay(raw);
    const newCents = parseCurrencyInput(raw);
    setCents(newCents);
  }

  function handleBlur() {
    if (cents > 0) {
      // Show canonical format: e.g. "5" → "5.00"
      setDisplay((cents / 100).toFixed(2));
    } else {
      setDisplay('');
    }
  }

  /** Call this to pre-fill from external source (e.g. URL params) */
  function setAmount(newCents: number) {
    setCents(newCents);
    setDisplay(newCents > 0 ? (newCents / 100).toFixed(2) : '');
  }

  return { display, cents, handleChange, handleBlur, setAmount };
}
