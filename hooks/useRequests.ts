'use client';

import { useEffect, useState } from 'react';
import { PaymentRequest } from '@/types';
import {
  subscribeToOutgoingRequests,
  subscribeToIncomingRequests,
} from '@/lib/firebase/requests';

export function useOutgoingRequests(userId: string | null) {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToOutgoingRequests(userId, (data) => {
      setRequests(data.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
      setLoading(false);
    });
    return unsubscribe;
  }, [userId]);

  return { requests, loading };
}

export function useIncomingRequests(userContact: string | null, userId: string | null) {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userContact || !userId) {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToIncomingRequests(userContact, userId, (data) => {
      setRequests(data.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
      setLoading(false);
    });
    return unsubscribe;
  }, [userContact, userId]);

  return { requests, loading };
}
