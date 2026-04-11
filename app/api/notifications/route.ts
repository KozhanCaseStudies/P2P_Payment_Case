import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

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

// PATCH: mark notifications as read
export async function PATCH(req: NextRequest) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { notificationIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { notificationIds } = body;
  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    return NextResponse.json({ error: 'notificationIds array is required' }, { status: 400 });
  }

  const batch = adminDb.batch();
  for (const id of notificationIds) {
    if (typeof id !== 'string') continue;
    const ref = adminDb.collection('notifications').doc(id);
    batch.update(ref, { read: true });
  }

  await batch.commit();
  return NextResponse.json({ success: true });
}
