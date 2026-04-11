import {
  collection, query, where, orderBy, onSnapshot, Unsubscribe,
} from 'firebase/firestore';
import { db } from './client';
import { Contact } from '@/types';

export function subscribeToContacts(
  ownerUid: string,
  callback: (contacts: Contact[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'contacts'),
    where('ownerUid', '==', ownerUid),
    orderBy('lastUsedAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const contacts = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Contact[];
    callback(contacts);
  });
}
