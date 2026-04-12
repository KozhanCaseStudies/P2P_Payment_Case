import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

const ALLOWED_TEST_UIDS = [
  'playwright-test-sender',
  'playwright-test-recipient',
];

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const uid = req.nextUrl.searchParams.get('uid');
  if (!uid || !ALLOWED_TEST_UIDS.includes(uid)) {
    return NextResponse.json({ error: 'Invalid UID' }, { status: 400 });
  }

  try {
    const token = await adminAuth.createCustomToken(uid);
    return NextResponse.json({ token });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create token';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
