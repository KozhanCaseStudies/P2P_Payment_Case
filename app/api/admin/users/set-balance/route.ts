import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

async function verifyAuth(req: NextRequest): Promise<string | null> {
  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  try {
    const token = authorization.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

// POST: Set a user's wallet balance
export async function POST(req: NextRequest) {
  const callerUid = await verifyAuth(req);
  if (!callerUid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { uid?: unknown; balanceCents?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { uid, balanceCents } = body;

  if (typeof uid !== 'string' || !uid.trim()) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  if (typeof balanceCents !== 'number' || !Number.isInteger(balanceCents) || balanceCents < 0) {
    return NextResponse.json({ error: 'Balance must be a non-negative integer (in cents)' }, { status: 400 });
  }

  // Verify user exists
  const userSnap = await adminDb.collection('users').doc(uid).get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const walletRef = adminDb.collection('wallets').doc(uid);
  const walletSnap = await walletRef.get();

  if (walletSnap.exists) {
    await walletRef.update({
      balanceCents,
      updatedAt: Timestamp.now(),
    });
  } else {
    await walletRef.set({
      uid,
      balanceCents,
      updatedAt: Timestamp.now(),
    });
  }

  return NextResponse.json({ uid, balanceCents });
}
