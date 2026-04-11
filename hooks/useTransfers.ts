'use client';

import { useEffect, useState } from 'react';
import { Transfer } from '@/types';
import { subscribeToTransfers } from '@/lib/firebase/transfers';

export function useTransfers(userEmail: string | null, userId: string | null) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail || !userId) {
      setTransfers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToTransfers(userEmail, userId, (data) => {
      setTransfers(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [userEmail, userId]);

  return { transfers, loading };
}
