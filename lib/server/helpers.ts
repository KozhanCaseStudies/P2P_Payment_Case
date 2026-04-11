import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { NotificationType } from '@/types';

export function formatAmountForNotification(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export async function autoSaveContact(ownerUid: string, email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase();
  const existing = await adminDb.collection('contacts')
    .where('ownerUid', '==', ownerUid)
    .where('email', '==', normalizedEmail)
    .limit(1)
    .get();

  const now = Timestamp.now();

  if (!existing.empty) {
    await existing.docs[0].ref.update({ lastUsedAt: now });
  } else {
    await adminDb.collection('contacts').add({
      ownerUid,
      email: normalizedEmail,
      displayName: normalizedEmail.split('@')[0],
      isFavorite: false,
      lastUsedAt: now,
      createdAt: now,
    });
  }
}

export async function createNotification(params: {
  recipientUid: string;
  type: NotificationType;
  title: string;
  body: string;
  amountCents: number;
  relatedId: string;
}): Promise<void> {
  await adminDb.collection('notifications').add({
    ...params,
    read: false,
    createdAt: Timestamp.now(),
  });
}
