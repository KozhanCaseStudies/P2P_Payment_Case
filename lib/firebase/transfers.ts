import {
  collection,
  query,
  where,
  or,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './client';
import { Transfer } from '@/types';

const COLLECTION = 'transfers';

export function subscribeToTransfers(
  userEmail: string,
  userId: string,
  callback: (transfers: Transfer[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION),
    or(
      where('senderId', '==', userId),
      where('recipientContact', '==', userEmail)
    )
  );
  return onSnapshot(q, (snap) => {
    const transfers = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Transfer[];
    callback(transfers.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
  });
}
