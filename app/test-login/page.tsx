'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase/client';
import { signInWithCustomToken } from 'firebase/auth';

function TestLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Authenticating...');

  useEffect(() => {
    const uid = searchParams.get('uid') ?? 'playwright-test-sender';
    const redirect = searchParams.get('redirect') ?? '/dashboard';

    async function login() {
      try {
        const res = await fetch(`/api/test/auth?uid=${encodeURIComponent(uid)}`);
        if (!res.ok) {
          const data = await res.json();
          setStatus(`Error: ${data.error}`);
          return;
        }
        const { token } = await res.json();
        await signInWithCustomToken(auth, token);
        setStatus('Redirecting...');
        router.replace(redirect);
      } catch (err) {
        setStatus(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    login();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground text-sm">{status}</p>
    </div>
  );
}

export default function TestLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <TestLoginInner />
    </Suspense>
  );
}
