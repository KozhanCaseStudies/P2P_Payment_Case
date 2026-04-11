'use client';

import { useEffect, useState } from 'react';
import { FavoriteTransaction } from '@/types';
import { subscribeToFavoriteTransactions } from '@/lib/firebase/favoriteTransactions';

export function useFavoriteTransactions(userId: string | null) {
  const [favorites, setFavorites] = useState<FavoriteTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setFavorites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToFavoriteTransactions(userId, (data) => {
      setFavorites(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [userId]);

  return { favorites, loading };
}
