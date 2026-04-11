import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { validateEmail, validateAmountCents } from '@/lib/validations';

async function getUid(req: NextRequest): Promise<string | null> {
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

// GET: list favorite transactions
export async function GET(req: NextRequest) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const snap = await adminDb.collection('favoriteTransactions')
    .where('ownerUid', '==', uid)
    .orderBy('createdAt', 'desc')
    .get();

  const favorites = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ favorites });
}

// POST: add a favorite transaction
export async function POST(req: NextRequest) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    type?: unknown;
    recipientContact?: unknown;
    recipientName?: unknown;
    amountCents?: unknown;
    note?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { type, recipientContact, recipientName, amountCents, note } = body;

  if (type !== 'transfer' && type !== 'request') {
    return NextResponse.json({ error: 'Type must be "transfer" or "request"' }, { status: 400 });
  }

  if (typeof recipientContact !== 'string' || !validateEmail(recipientContact)) {
    return NextResponse.json({ error: 'Valid recipient email is required' }, { status: 400 });
  }

  if (typeof amountCents !== 'number' || !validateAmountCents(amountCents)) {
    return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
  }

  const name = typeof recipientName === 'string' && recipientName.trim()
    ? recipientName.trim()
    : recipientContact.split('@')[0];

  const docRef = await adminDb.collection('favoriteTransactions').add({
    ownerUid: uid,
    type,
    recipientContact: recipientContact.toLowerCase(),
    recipientName: name,
    amountCents,
    ...(typeof note === 'string' && note.trim() ? { note: note.trim() } : {}),
    createdAt: Timestamp.now(),
  });

  return NextResponse.json({ id: docRef.id }, { status: 201 });
}

// DELETE: remove a favorite transaction
export async function DELETE(req: NextRequest) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  const docRef = adminDb.collection('favoriteTransactions').doc(id);
  const snap = await docRef.get();

  if (!snap.exists || snap.data()!.ownerUid !== uid) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await docRef.delete();
  return NextResponse.json({ success: true });
}
