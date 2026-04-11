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
