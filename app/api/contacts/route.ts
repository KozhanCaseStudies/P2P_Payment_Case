import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { validateEmail } from '@/lib/validations';

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

// GET: list contacts
export async function GET(req: NextRequest) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const snap = await adminDb.collection('contacts')
    .where('ownerUid', '==', uid)
    .orderBy('lastUsedAt', 'desc')
    .get();

  const contacts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ contacts });
}

// POST: add or update contact
export async function POST(req: NextRequest) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { email?: unknown; displayName?: unknown; isFavorite?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email, displayName, isFavorite } = body;

  if (typeof email !== 'string' || !validateEmail(email)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }

  // Check if contact already exists
  const existing = await adminDb.collection('contacts')
    .where('ownerUid', '==', uid)
    .where('email', '==', email.toLowerCase())
    .limit(1)
    .get();

  const now = Timestamp.now();

  if (!existing.empty) {
    // Update existing contact
    const docRef = existing.docs[0].ref;
    const updates: Record<string, unknown> = { lastUsedAt: now };
    if (typeof displayName === 'string') updates.displayName = displayName;
    if (typeof isFavorite === 'boolean') updates.isFavorite = isFavorite;
    await docRef.update(updates);
    return NextResponse.json({ id: existing.docs[0].id, ...existing.docs[0].data(), ...updates });
  }

  // Create new contact
  const name = typeof displayName === 'string' && displayName.trim()
    ? displayName.trim()
    : email.split('@')[0];

  const docRef = await adminDb.collection('contacts').add({
    ownerUid: uid,
    email: email.toLowerCase(),
    displayName: name,
    isFavorite: isFavorite === true,
    lastUsedAt: now,
    createdAt: now,
  });

  return NextResponse.json({ id: docRef.id, email: email.toLowerCase(), displayName: name }, { status: 201 });
}

// PATCH: toggle favorite
export async function PATCH(req: NextRequest) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { contactId?: unknown; isFavorite?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { contactId, isFavorite } = body;
  if (typeof contactId !== 'string' || typeof isFavorite !== 'boolean') {
    return NextResponse.json({ error: 'contactId and isFavorite are required' }, { status: 400 });
  }

  const docRef = adminDb.collection('contacts').doc(contactId);
  const snap = await docRef.get();

  if (!snap.exists || snap.data()!.ownerUid !== uid) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  await docRef.update({ isFavorite });
  return NextResponse.json({ id: contactId, isFavorite });
}

// DELETE: remove contact
export async function DELETE(req: NextRequest) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get('id');

  if (!contactId) {
    return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
  }

  const docRef = adminDb.collection('contacts').doc(contactId);
  const snap = await docRef.get();

  if (!snap.exists || snap.data()!.ownerUid !== uid) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  await docRef.delete();
  return NextResponse.json({ success: true });
}
