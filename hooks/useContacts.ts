'use client';

import { useEffect, useState } from 'react';
import { Contact } from '@/types';
import { subscribeToContacts } from '@/lib/firebase/contacts';

export function useContacts(userId: string | null) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setContacts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToContacts(userId, (data) => {
      setContacts(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [userId]);

  return { contacts, loading };
}
