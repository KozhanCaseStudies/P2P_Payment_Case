import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './client';
import { PaymentRequest, CreateRequestInput } from '@/types';
import { getExpiresAt, isExpired } from '@/lib/utils';

const COLLECTION = 'paymentRequests';

export async function createRequest(
  senderId: string,
  senderEmail: string,
  senderName: string,
  data: CreateRequestInput,
  appUrl: string
): Promise<string> {
  const ref = doc(collection(db, COLLECTION));
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromDate(getExpiresAt(now.toDate()));

  const request: Omit<PaymentRequest, 'id'> = {
    senderId,
    senderEmail,
    senderName,
    recipientContact: data.recipientContact,
    amountCents: data.amountCents,
    note: data.note,
    status: 'pending',
    shareableLink: `${appUrl}/request/${ref.id}`,
    createdAt: now,
    expiresAt,
    updatedAt: now,
  };

  await setDoc(ref, request);
  return ref.id;
}

export async function getRequest(id: string): Promise<PaymentRequest | null> {
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = { id: snap.id, ...snap.data() } as PaymentRequest;

  // Read-time expiration check
  if (data.status === 'pending' && isExpired(data.expiresAt)) {
    data.status = 'expired';
    // Lazy write expiration to Firestore
    updateDoc(ref, { status: 'expired', updatedAt: Timestamp.now() }).catch(() => {});
  }

  return data;
}

export function subscribeToOutgoingRequests(
  userId: string,
  callback: (requests: PaymentRequest[]) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTION), where('senderId', '==', userId));
  return onSnapshot(q, (snap) => {
    const requests = snap.docs.map((d) => {
      const data = { id: d.id, ...d.data() } as PaymentRequest;
      if (data.status === 'pending' && isExpired(data.expiresAt)) {
        data.status = 'expired';
      }
      return data;
    });
    callback(requests);
  });
}

export function subscribeToIncomingRequests(
  userContact: string,
  userId: string,
  callback: (requests: PaymentRequest[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION),
    where('recipientContact', '==', userContact)
  );
  return onSnapshot(q, (snap) => {
    const requests = snap.docs.map((d) => {
      const data = { id: d.id, ...d.data() } as PaymentRequest;
      if (data.status === 'pending' && isExpired(data.expiresAt)) {
        data.status = 'expired';
      }
      return data;
    });
    callback(requests);
  });
}

export async function linkRecipientUid(requestId: string, uid: string): Promise<void> {
  const ref = doc(db, COLLECTION, requestId);
  await updateDoc(ref, { recipientUid: uid, updatedAt: Timestamp.now() });
}
