'use client';

import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { formatCurrency } from '@/lib/utils';
import { Notification } from '@/types';
import { auth } from '@/lib/firebase/client';
import { Bell, DollarSign, XCircle, Ban, ArrowDownLeft } from 'lucide-react';

const ICON_MAP: Record<Notification['type'], typeof DollarSign> = {
  request_received: ArrowDownLeft,
  request_paid: DollarSign,
  request_declined: XCircle,
  request_cancelled: Ban,
  transfer_received: ArrowDownLeft,
};

const COLOR_MAP: Record<Notification['type'], string> = {
  request_received: 'bg-blue-500/15 text-blue-400',
  request_paid: 'bg-emerald-500/15 text-emerald-400',
  request_declined: 'bg-rose-500/15 text-rose-400',
  request_cancelled: 'bg-muted text-muted-foreground',
  transfer_received: 'bg-emerald-500/15 text-emerald-400',
};

function timeAgo(timestamp: { toMillis: () => number }): string {
  const diff = Date.now() - timestamp.toMillis();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell({ userId }: { userId: string }) {
  const { notifications, unreadCount } = useNotifications(userId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    try {
      const token = await auth.currentUser!.getIdToken();
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notificationIds: unreadIds }),
      });
    } catch {
      // Silently fail
    }
  }

  function handleOpen() {
    setOpen(!open);
    if (!open && unreadCount > 0) {
      markAllRead();
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-accent transition-colors"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card rounded-xl shadow-2xl border border-border z-50 max-h-96 overflow-y-auto">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-display font-semibold text-foreground">Notifications</h3>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.slice(0, 20).map((n) => {
                const Icon = ICON_MAP[n.type];
                const colorClass = COLOR_MAP[n.type];
                return (
                  <div
                    key={n.id}
                    className={`px-4 py-3 flex items-start gap-3 transition-colors ${
                      !n.read ? 'bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">{n.body}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                    <span className="font-numeric text-sm font-semibold text-foreground shrink-0">
                      {formatCurrency(n.amountCents)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
