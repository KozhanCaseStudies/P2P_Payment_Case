'use client';

import { useState, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import { getCountdownText, isExpired } from '@/lib/utils';

export function ExpirationCountdown({ expiresAt }: { expiresAt: Timestamp }) {
  const [text, setText] = useState(() => getCountdownText(expiresAt));
  const expired = isExpired(expiresAt);

  useEffect(() => {
    if (expired) return;
    const interval = setInterval(() => {
      setText(getCountdownText(expiresAt));
    }, 60_000);
    return () => clearInterval(interval);
  }, [expiresAt, expired]);

  const isUrgent = !expired && expiresAt.toMillis() - Date.now() < 60 * 60 * 1000;

  return (
    <span className={`text-xs ${isUrgent ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
      {text}
    </span>
  );
}
