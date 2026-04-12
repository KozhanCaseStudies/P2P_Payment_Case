import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local before importing firebase-admin
config({ path: resolve(process.cwd(), '.env.local') });

import * as admin from 'firebase-admin';

const PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID!;
const CLIENT_EMAIL = process.env.FIREBASE_ADMIN_CLIENT_EMAIL!;
const PRIVATE_KEY = process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, '\n');

const SENDER_UID = 'playwright-test-sender';
const RECIPIENT_UID = 'playwright-test-recipient';

async function globalSetup() {
  // Init admin if not already initialized
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId: PROJECT_ID, clientEmail: CLIENT_EMAIL, privateKey: PRIVATE_KEY }),
    });
  }

  const auth = admin.auth();
  const db = admin.firestore();

  // Upsert sender auth user
  await upsertUser(auth, SENDER_UID, {
    email: 'playwright-sender@payrequest.test',
    displayName: 'PW Sender',
    password: 'testpassword123',
  });

  // Upsert recipient auth user
  await upsertUser(auth, RECIPIENT_UID, {
    email: 'playwright-recipient@payrequest.test',
    displayName: 'PW Recipient',
    password: 'testpassword123',
  });

  // Upsert Firestore user docs
  await db.collection('users').doc(SENDER_UID).set(
    { uid: SENDER_UID, email: 'playwright-sender@payrequest.test', displayName: 'PW Sender' },
    { merge: true }
  );
  await db.collection('users').doc(RECIPIENT_UID).set(
    { uid: RECIPIENT_UID, email: 'playwright-recipient@payrequest.test', displayName: 'PW Recipient' },
    { merge: true }
  );

  // Give sender $200 balance, wipe recipient balance to 0
  await db.collection('wallets').doc(SENDER_UID).set(
    { uid: SENDER_UID, balanceCents: 20000, updatedAt: admin.firestore.Timestamp.now() },
    { merge: true }
  );
  await db.collection('wallets').doc(RECIPIENT_UID).set(
    { uid: RECIPIENT_UID, balanceCents: 0, updatedAt: admin.firestore.Timestamp.now() },
    { merge: true }
  );

  console.log('[global-setup] Test users provisioned.');
}

async function upsertUser(
  auth: admin.auth.Auth,
  uid: string,
  props: { email: string; displayName: string; password: string }
) {
  try {
    await auth.updateUser(uid, props);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'auth/user-not-found') {
      await auth.createUser({ uid, ...props });
    } else {
      throw err;
    }
  }
}

export default globalSetup;
