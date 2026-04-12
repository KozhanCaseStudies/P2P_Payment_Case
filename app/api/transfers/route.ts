import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { validateContact, validateAmountCents, validateNote, validateEmail } from '@/lib/validations';
import { autoSaveContact, createNotification, formatAmountForNotification } from '@/lib/server/helpers';

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

  // Sanitize & validate recipient
  const recipient =
    typeof recipientContact === 'string' ? recipientContact.trim() : '';
  if (!recipient || !validateContact(recipient)) {
    return NextResponse.json(
      { error: 'Please enter a valid email or phone number (e.g. +14155552671)' },
      { status: 400 }
    );
  }

  // Sanitize & validate amount — must be a positive integer (cents)
  const safeCents =
    typeof amountCents === 'number' ? Math.trunc(amountCents) : NaN;
  if (!Number.isFinite(safeCents) || !validateAmountCents(safeCents)) {
    return NextResponse.json(
      { error: 'Amount must be between $0.01 and $10,000.00' },
      { status: 400 }
    );
  }

  // Sanitize & validate note
  const noteText =
    note !== undefined
      ? typeof note === 'string'
        ? note.trim().slice(0, 280)
        : null
      : undefined;
  if (noteText === null) {
    return NextResponse.json(
      { error: 'Note must be a string' },
      { status: 400 }
    );
  }

  if (validateEmail(recipient) && recipient.toLowerCase() === userEmail.toLowerCase()) {
    return NextResponse.json(
      { error: "You can't send money to yourself." },
      { status: 400 }
    );
  }

  // Atomic transaction: deduct from sender, credit recipient, create transfer
  const senderWalletRef = adminDb.collection('wallets').doc(uid);
  const transferRef = adminDb.collection('transfers').doc();

  // Find recipient — must be a registered user
  let recipientUid: string;
  if (validateEmail(recipient)) {
    const usersSnap = await adminDb.collection('users')
      .where('email', '==', recipient.toLowerCase())
      .limit(1)
      .get();
    if (usersSnap.empty) {
      return NextResponse.json(
        { error: 'This user is not registered on PayRequest. You can only send money to registered users.' },
        { status: 404 }
      );
    }
    recipientUid = usersSnap.docs[0].id;
  } else {
    const usersSnap = await adminDb.collection('users')
      .where('phone', '==', recipient)
      .limit(1)
      .get();
    if (usersSnap.empty) {
      return NextResponse.json(
        { error: 'This user is not registered on PayRequest. You can only send money to registered users.' },
        { status: 404 }
      );
    }
    recipientUid = usersSnap.docs[0].id;
  }

  try {
    await adminDb.runTransaction(async (tx) => {
      // All reads first
      const recipientWalletRef = adminDb.collection('wallets').doc(recipientUid);
      const [senderSnap, recipientSnap] = await Promise.all([
        tx.get(senderWalletRef),
        tx.get(recipientWalletRef),
      ]);

      const senderBalance = senderSnap.exists ? senderSnap.data()!.balanceCents : 0;
      if (senderBalance < safeCents) {
        throw new Error('Insufficient balance. Please add funds.');
      }

      // All writes after reads
      tx.update(senderWalletRef, {
        balanceCents: FieldValue.increment(-safeCents),
        updatedAt: Timestamp.now(),
      });

      if (recipientSnap.exists) {
        tx.update(recipientWalletRef, {
          balanceCents: FieldValue.increment(safeCents),
          updatedAt: Timestamp.now(),
        });
      } else {
        tx.set(recipientWalletRef, {
          uid: recipientUid,
          balanceCents: safeCents,
          updatedAt: Timestamp.now(),
        });
      }

      // Create transfer document
      tx.set(transferRef, {
        senderId: uid,
        senderEmail: userEmail,
        senderName: userName,
        recipientContact: recipient,
        recipientUid,
        amountCents: safeCents,
        ...(noteText ? { note: noteText } : {}),
        createdAt: Timestamp.now(),
      });
    });

    // Auto-save contact (non-blocking)
    autoSaveContact(uid, recipient).catch(() => {});

    // Create notification for recipient (non-blocking)
    if (recipientUid) {
      createNotification({
        recipientUid,
        type: 'transfer_received',
        title: 'Money Received',
        body: `${userName} sent you ${formatAmountForNotification(safeCents)}`,
        amountCents: safeCents,
        relatedId: transferRef.id,
      }).catch(() => {});
    }

    return NextResponse.json({ id: transferRef.id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transfer failed. Please try again.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
