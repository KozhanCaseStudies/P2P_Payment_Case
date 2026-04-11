import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { validateEmail, validateAmountCents } from '@/lib/validations';

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

// GET: List all users with their wallet balances
export async function GET(req: NextRequest) {
  const uid = await verifyAuth(req);
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const usersSnap = await adminDb.collection('users').orderBy('createdAt', 'desc').get();
  const users = await Promise.all(
    usersSnap.docs.map(async (doc) => {
      const data = doc.data();
      const walletSnap = await adminDb.collection('wallets').doc(doc.id).get();
      const balanceCents = walletSnap.exists ? walletSnap.data()!.balanceCents : 0;
      return {
        uid: doc.id,
        email: data.email,
        displayName: data.displayName,
        createdAt: data.createdAt,
        balanceCents,
      };
    })
  );

  return NextResponse.json({ users });
}

// POST: Create a new user and optionally set wallet balance
export async function POST(req: NextRequest) {
  const callerUid = await verifyAuth(req);
  if (!callerUid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { email?: unknown; displayName?: unknown; balanceCents?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email, displayName, balanceCents } = body;

  if (typeof email !== 'string' || !validateEmail(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
  }

  if (displayName !== undefined && typeof displayName !== 'string') {
    return NextResponse.json({ error: 'Display name must be a string' }, { status: 400 });
  }

  if (balanceCents !== undefined && (typeof balanceCents !== 'number' || !Number.isInteger(balanceCents) || balanceCents < 0)) {
    return NextResponse.json({ error: 'Balance must be a non-negative integer (in cents)' }, { status: 400 });
  }

  // Check if user already exists
  const existingSnap = await adminDb.collection('users')
    .where('email', '==', email.toLowerCase())
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
  }

  // Create Firebase Auth user
  let newUser;
  try {
    newUser = await adminAuth.createUser({
      email: email.toLowerCase(),
      displayName: displayName || email.split('@')[0],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create user';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const name = displayName || email.split('@')[0];
  const now = Timestamp.now();

  // Create user document
  await adminDb.collection('users').doc(newUser.uid).set({
    uid: newUser.uid,
    email: email.toLowerCase(),
    displayName: name,
    createdAt: now,
  });

  // Create wallet
  const initialBalance = balanceCents ?? 0;
  await adminDb.collection('wallets').doc(newUser.uid).set({
    uid: newUser.uid,
    balanceCents: initialBalance,
    updatedAt: now,
  });

  return NextResponse.json({
    uid: newUser.uid,
    email: email.toLowerCase(),
    displayName: name,
    balanceCents: initialBalance,
  }, { status: 201 });
}
