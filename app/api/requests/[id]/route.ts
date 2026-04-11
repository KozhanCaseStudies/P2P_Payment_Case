import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { createNotification, formatAmountForNotification } from '@/lib/server/helpers';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let uid: string;
  let userName: string;
  try {
    const token = authorization.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
    userName = decoded.name ?? decoded.email?.split('@')[0] ?? 'Someone';
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { action?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { action } = body;
  if (action !== 'pay' && action !== 'decline' && action !== 'cancel') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const ref = adminDb.collection('paymentRequests').doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json(
      { error: "This request doesn't exist or has been removed." },
      { status: 404 }
    );
  }

  const data = snap.data()!;
  const isExpired = data.expiresAt.toMillis() <= Date.now();
  const amountCents = data.amountCents;
  const amountStr = formatAmountForNotification(amountCents);

  if (data.status !== 'pending') {
    return NextResponse.json(
      { error: `This request has already been ${data.status}.` },
      { status: 409 }
    );
  }

  if (action === 'cancel') {
    if (data.senderId !== uid) {
      return NextResponse.json(
        { error: "You don't have permission to perform this action." },
        { status: 403 }
      );
    }
    await ref.update({ status: 'cancelled', updatedAt: Timestamp.now() });

    // Notify recipient if they're registered
    if (data.recipientUid) {
      createNotification({
        recipientUid: data.recipientUid,
        type: 'request_cancelled',
        title: 'Request Cancelled',
        body: `${data.senderName} cancelled their ${amountStr} request`,
        amountCents,
        relatedId: id,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  }

  // pay or decline — recipient only
  if (data.recipientUid && data.recipientUid !== uid) {
    return NextResponse.json(
      { error: "You don't have permission to perform this action." },
      { status: 403 }
    );
  }

  if (isExpired) {
    return NextResponse.json(
      { error: 'This request has expired and can no longer be paid.' },
      { status: 409 }
    );
  }

  if (action === 'decline') {
    await ref.update({
      status: 'declined',
      updatedAt: Timestamp.now(),
      recipientUid: uid,
    });

    // Notify sender
    createNotification({
      recipientUid: data.senderId,
      type: 'request_declined',
      title: 'Request Declined',
      body: `${userName} declined your ${amountStr} request`,
      amountCents,
      relatedId: id,
    }).catch(() => {});

    return NextResponse.json({ success: true });
  }

  // action === 'pay' — wallet transaction
  const payerWalletRef = adminDb.collection('wallets').doc(uid);
  const senderWalletRef = adminDb.collection('wallets').doc(data.senderId);

  try {
    await adminDb.runTransaction(async (tx) => {
      // All reads first
      const [payerSnap, senderSnap] = await Promise.all([
        tx.get(payerWalletRef),
        tx.get(senderWalletRef),
      ]);

      const payerBalance = payerSnap.exists ? payerSnap.data()!.balanceCents : 0;
      if (payerBalance < amountCents) {
        throw new Error('Insufficient balance. Please add funds.');
      }

      // All writes after reads
      if (payerSnap.exists) {
        tx.update(payerWalletRef, {
          balanceCents: FieldValue.increment(-amountCents),
          updatedAt: Timestamp.now(),
        });
      }

      if (senderSnap.exists) {
        tx.update(senderWalletRef, {
          balanceCents: FieldValue.increment(amountCents),
          updatedAt: Timestamp.now(),
        });
      } else {
        tx.set(senderWalletRef, {
          uid: data.senderId,
          balanceCents: amountCents,
          updatedAt: Timestamp.now(),
        });
      }

      tx.update(ref, {
        status: 'paid',
        paidAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        recipientUid: uid,
      });
    });

    // Notify sender that request was paid
    createNotification({
      recipientUid: data.senderId,
      type: 'request_paid',
      title: 'Request Paid',
      body: `${userName} paid your ${amountStr} request`,
      amountCents,
      relatedId: id,
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Payment failed. Please try again.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
