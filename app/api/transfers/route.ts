import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { validateContact, validateAmountCents, validateNote, validateEmail } from '@/lib/validations';

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
      { error: "You can't send money to yourself." },
      { status: 400 }
    );
  }

  // Atomic transaction: deduct from sender, credit recipient, create transfer
  const senderWalletRef = adminDb.collection('wallets').doc(uid);
  const transferRef = adminDb.collection('transfers').doc();

  // Find recipient — must be a registered user
  let recipientUid: string;
  if (validateEmail(recipientContact)) {
    const usersSnap = await adminDb.collection('users')
      .where('email', '==', recipientContact.toLowerCase())
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
    // Phone number — look up by phone
    const usersSnap = await adminDb.collection('users')
      .where('phone', '==', recipientContact)
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
      if (senderBalance < amountCents) {
        throw new Error('Insufficient balance. Please add funds.');
      }

      // All writes after reads
      tx.update(senderWalletRef, {
        balanceCents: FieldValue.increment(-amountCents),
        updatedAt: Timestamp.now(),
      });

      if (recipientSnap.exists) {
        tx.update(recipientWalletRef, {
          balanceCents: FieldValue.increment(amountCents),
          updatedAt: Timestamp.now(),
        });
      } else {
        tx.set(recipientWalletRef, {
          uid: recipientUid,
          balanceCents: amountCents,
          updatedAt: Timestamp.now(),
        });
      }

      // Create transfer document
      tx.set(transferRef, {
        senderId: uid,
        senderEmail: userEmail,
        senderName: userName,
        recipientContact,
        recipientUid,
        amountCents,
        ...(note ? { note } : {}),
        createdAt: Timestamp.now(),
      });
    });

    return NextResponse.json({ id: transferRef.id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transfer failed. Please try again.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
