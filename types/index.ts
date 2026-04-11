import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  createdAt: Timestamp;
}

export type RequestStatus = 'pending' | 'paid' | 'declined' | 'expired' | 'cancelled';

export interface PaymentRequest {
  id: string;
  senderId: string;
  senderEmail: string;
  senderName: string;
  recipientContact: string;
  recipientUid?: string;
  amountCents: number;
  note?: string;
  status: RequestStatus;
  shareableLink: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  updatedAt: Timestamp;
  paidAt?: Timestamp;
}

export interface CreateRequestInput {
  recipientContact: string;
  amountCents: number;
  note?: string;
}

export interface Wallet {
  uid: string;
  balanceCents: number;
  updatedAt: Timestamp;
}

export interface Transfer {
  id: string;
  senderId: string;
  senderEmail: string;
  senderName: string;
  recipientContact: string;
  recipientUid?: string;
  amountCents: number;
  note?: string;
  createdAt: Timestamp;
}

export interface Contact {
  id: string;
  ownerUid: string;
  email: string;
  displayName: string;
  isFavorite: boolean;
  lastUsedAt: Timestamp;
  createdAt: Timestamp;
}

export type NotificationType =
  | 'request_received'
  | 'request_paid'
  | 'request_declined'
  | 'request_cancelled'
  | 'transfer_received';

export interface FavoriteTransaction {
  id: string;
  ownerUid: string;
  type: 'transfer' | 'request';
  recipientContact: string;
  recipientName: string;
  amountCents: number;
  note?: string;
  createdAt: Timestamp;
}

export interface Notification {
  id: string;
  recipientUid: string;
  type: NotificationType;
  title: string;
  body: string;
  amountCents: number;
  relatedId: string;
  read: boolean;
  createdAt: Timestamp;
}
