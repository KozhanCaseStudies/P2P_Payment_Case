import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

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
  try {
    const token = authorization.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
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

  const update: Record<string, unknown> = {
    status: action === 'pay' ? 'paid' : 'declined',
    updatedAt: Timestamp.now(),
    recipientUid: uid,
  };
  if (action === 'pay') {
    update.paidAt = Timestamp.now();
  }

  await ref.update(update);
  return NextResponse.json({ success: true });
}
