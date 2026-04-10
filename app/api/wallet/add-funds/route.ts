import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { validateAmountCents } from '@/lib/validations';

export async function POST(req: NextRequest) {
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

  let body: { amountCents?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { amountCents } = body;
  if (typeof amountCents !== 'number' || !validateAmountCents(amountCents)) {
    return NextResponse.json(
      { error: 'Amount must be between $0.01 and $10,000.00' },
      { status: 400 }
    );
  }

  const ref = adminDb.collection('wallets').doc(uid);
  const snap = await ref.get();

  if (!snap.exists) {
    await ref.set({ uid, balanceCents: amountCents, updatedAt: Timestamp.now() });
  } else {
    await ref.update({
      balanceCents: FieldValue.increment(amountCents),
      updatedAt: Timestamp.now(),
    });
  }

  const updated = await ref.get();
  return NextResponse.json({ balanceCents: updated.data()!.balanceCents });
}
