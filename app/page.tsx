'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/client';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation') ?? '';
      }
      signInWithEmailLink(auth, email, window.location.href)
        .then(async (result) => {
          window.localStorage.removeItem('emailForSignIn');
          const userRef = doc(db, 'users', result.user.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: result.user.uid,
              email: result.user.email ?? email,
              displayName: (result.user.email ?? email)!.split('@')[0],
              createdAt: Timestamp.now(),
            });
            // Auto-create wallet with 0 balance
            const walletRef = doc(db, 'wallets', result.user.uid);
            await setDoc(walletRef, {
              uid: result.user.uid,
              balanceCents: 0,
              updatedAt: Timestamp.now(),
            });
          }
          const redirectTo = window.localStorage.getItem('redirectAfterLogin') ?? '/dashboard';
          window.localStorage.removeItem('redirectAfterLogin');
          router.replace(redirectTo);
        })
        .catch(() => {
          router.replace('/login?error=invalid-link');
        });
      return;
    }

    if (!loading) {
      router.replace(user ? '/dashboard' : '/login');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
