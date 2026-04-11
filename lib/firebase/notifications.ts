import {
  collection, query, where, orderBy, onSnapshot, Unsubscribe,
} from 'firebase/firestore';
import { db } from './client';
import { Notification } from '@/types';

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'notifications'),
    where('recipientUid', '==', userId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Notification[];
    callback(notifications);
  });
}
