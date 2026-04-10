import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './client';
import { Wallet } from '@/types';

const COLLECTION = 'wallets';

export async function getWallet(uid: string): Promise<Wallet> {
  const ref = doc(db, COLLECTION, uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const wallet: Wallet = {
      uid,
      balanceCents: 0,
      updatedAt: Timestamp.now(),
    };
    await setDoc(ref, wallet);
    return wallet;
  }

  return snap.data() as Wallet;
}

export function subscribeToWallet(
  uid: string,
  callback: (wallet: Wallet) => void
): Unsubscribe {
  const ref = doc(db, COLLECTION, uid);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as Wallet);
    } else {
      const wallet: Wallet = { uid, balanceCents: 0, updatedAt: Timestamp.now() };
      setDoc(ref, wallet);
      callback(wallet);
    }
  });
}
