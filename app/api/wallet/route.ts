import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(req: NextRequest) {
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

  const ref = adminDb.collection('wallets').doc(uid);
  const snap = await ref.get();

  if (!snap.exists) {
    await ref.set({ uid, balanceCents: 0, updatedAt: Timestamp.now() });
    return NextResponse.json({ balanceCents: 0 });
  }

  return NextResponse.json({ balanceCents: snap.data()!.balanceCents });
}
