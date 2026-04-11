import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { validateContact, validateAmountCents, validateNote, validateEmail } from '@/lib/validations';
import { Timestamp } from 'firebase-admin/firestore';
import { autoSaveContact, createNotification, formatAmountForNotification } from '@/lib/server/helpers';

function getExpiresAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
}

export async function POST(req: NextRequest) {
  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let uid: string;
  let userEmail: string;
  let userName: string;

  try {
    const token = authorization.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
    userEmail = decoded.email ?? '';
    userName = decoded.name ?? decoded.email?.split('@')[0] ?? 'User';
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { recipientContact?: unknown; amountCents?: unknown; note?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { recipientContact, amountCents, note } = body;

  if (typeof recipientContact !== 'string' || !validateContact(recipientContact)) {
    return NextResponse.json(
      { error: 'Please enter a valid email or phone number (e.g. +14155552671)' },
      { status: 400 }
    );
  }

  if (typeof amountCents !== 'number' || !validateAmountCents(amountCents)) {
    return NextResponse.json(
      { error: 'Amount must be between $0.01 and $10,000.00' },
      { status: 400 }
    );
  }

  if (note !== undefined && (typeof note !== 'string' || !validateNote(note))) {
    return NextResponse.json(
      { error: 'Note must be 280 characters or less' },
      { status: 400 }
    );
  }

  if (validateEmail(recipientContact) && recipientContact.toLowerCase() === userEmail.toLowerCase()) {
    return NextResponse.json(
      { error: "You can't request money from yourself." },
      { status: 400 }
    );
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const ref = adminDb.collection('paymentRequests').doc();
    const now = new Date();
    const expiresAt = getExpiresAt(now);

    await ref.set({
      senderId: uid,
      senderEmail: userEmail,
      senderName: userName,
      recipientContact,
      amountCents,
      ...(note ? { note } : {}),
      status: 'pending',
      shareableLink: `${appUrl}/request/${ref.id}`,
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expiresAt),
      updatedAt: Timestamp.fromDate(now),
    });

    // Auto-save contact (non-blocking)
    autoSaveContact(uid, recipientContact).catch(() => {});

    // Notify recipient if they have an account
    if (validateEmail(recipientContact)) {
      const recipientSnap = await adminDb.collection('users')
        .where('email', '==', recipientContact.toLowerCase())
        .limit(1)
        .get();
      if (!recipientSnap.empty) {
        createNotification({
          recipientUid: recipientSnap.docs[0].id,
          type: 'request_received',
          title: 'Payment Request',
          body: `${userName} is requesting ${formatAmountForNotification(amountCents)}`,
          amountCents,
          relatedId: ref.id,
        }).catch(() => {});
      }
    }

    return NextResponse.json(
      { id: ref.id, shareableLink: `${appUrl}/request/${ref.id}` },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
