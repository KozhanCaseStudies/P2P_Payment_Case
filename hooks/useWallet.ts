'use client';

import { useEffect, useState } from 'react';
import { Wallet } from '@/types';
import { subscribeToWallet } from '@/lib/firebase/wallet';

export function useWallet(uid: string | null) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setWallet(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToWallet(uid, (w) => {
      setWallet(w);
      setLoading(false);
    });
    return unsubscribe;
  }, [uid]);

  return { wallet, loading };
}
