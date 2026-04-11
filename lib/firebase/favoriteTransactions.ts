import {
  collection, query, where, orderBy, onSnapshot, Unsubscribe,
} from 'firebase/firestore';
import { db } from './client';
import { FavoriteTransaction } from '@/types';

export function subscribeToFavoriteTransactions(
  ownerUid: string,
  callback: (favorites: FavoriteTransaction[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'favoriteTransactions'),
    where('ownerUid', '==', ownerUid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const favorites = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as FavoriteTransaction[];
    callback(favorites);
  });
}
