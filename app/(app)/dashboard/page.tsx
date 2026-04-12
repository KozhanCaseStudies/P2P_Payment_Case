'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOutgoingRequests, useIncomingRequests } from '@/hooks/useRequests';
import { useTransfers } from '@/hooks/useTransfers';
import { useWallet } from '@/hooks/useWallet';
import { PaymentRequest, RequestStatus } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { RequestCard } from '@/components/RequestCard';
import { TransferCard } from '@/components/TransferCard';
import { AddFundsDialog } from '@/components/AddFundsDialog';
import { NotificationBell } from '@/components/NotificationBell';
import { SummaryStats } from '@/components/SummaryStats';
import { QuickActions } from '@/components/QuickActions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  LogOut,
  Send,
  Settings,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

const STATUS_OPTIONS: { label: string; value: 'all' | RequestStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Paid', value: 'paid' },
  { label: 'Declined', value: 'declined' },
  { label: 'Expired', value: 'expired' },
  { label: 'Cancelled', value: 'cancelled' },
];

function filterRequests(
  requests: PaymentRequest[],
  search: string,
  status: 'all' | RequestStatus
): PaymentRequest[] {
  return requests.filter((r) => {
    const matchesStatus = status === 'all' || r.status === status;
    const searchLower = search.toLowerCase();
    const matchesSearch =
      !search ||
      r.recipientContact.toLowerCase().includes(searchLower) ||
      r.senderName.toLowerCase().includes(searchLower) ||
      r.senderEmail.toLowerCase().includes(searchLower);
    return matchesStatus && matchesSearch;
  });
}

function CardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RequestStatus>('all');
  const [addFundsOpen, setAddFundsOpen] = useState(false);

  const { wallet } = useWallet(user?.uid ?? null);
  const { requests: outgoing, loading: outLoading } = useOutgoingRequests(user?.uid ?? null);
  const { requests: incoming, loading: inLoading } = useIncomingRequests(
    user?.email ?? null,
    user?.uid ?? null
  );
  const { transfers, loading: transfersLoading } = useTransfers(
    user?.email ?? null,
    user?.uid ?? null
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.replace('/login');
    return null;
  }

  const filteredOutgoing = filterRequests(outgoing, search, statusFilter);
  const filteredIncoming = filterRequests(incoming, search, statusFilter);
  const pendingIncomingCount = incoming.filter((r) => r.status === 'pending').length;

  async function handleSignOut() {
    await signOut(auth);
    router.replace('/login');
  }

  const displayName = user.displayName?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'there';

  return (
    <div className="min-h-screen">
      {/* ── Header ───────────────────────────────────── */}
      <header className="glass sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            Pay<span className="text-primary">•</span>Request
          </span>
          <div className="flex items-center gap-1">
            <NotificationBell userId={user.uid} />
            <Link
              href="/admin"
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-accent transition-colors"
              title="Admin Panel"
            >
              <Settings className="w-4 h-4" />
            </Link>
            <button
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-accent transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <AddFundsDialog open={addFundsOpen} onOpenChange={setAddFundsOpen} />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* ── Balance Hero ─────────────────────────── */}
        <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
          <p className="text-sm text-muted-foreground mb-4">
            Good to see you, <span className="text-foreground font-medium">{displayName}</span>
          </p>
          <div className="relative bg-card border border-border rounded-2xl p-5 overflow-hidden card-glow transition-all duration-300">
            {/* Decorative glow */}
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-primary/5 blur-2xl pointer-events-none -translate-y-1/2 translate-x-1/4" />
            <div className="relative">
              <p className="text-xs font-display font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-1">
                Available Balance
              </p>
              <div className="flex items-end justify-between gap-4">
                <p className="font-numeric text-4xl font-bold text-foreground tracking-tight">
                  {wallet ? formatCurrency(wallet.balanceCents) : (
                    <span className="opacity-30">——</span>
                  )}
                </p>
                <button
                  onClick={() => setAddFundsOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Funds
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Action Tiles ─────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: '60ms' }}>
          <Link href="/send" className="block">
            <div className="bg-primary rounded-2xl p-5 flex flex-col gap-3 hover:brightness-110 active:scale-[0.98] transition-all duration-200 cursor-pointer h-full">
              <div className="w-10 h-10 rounded-xl bg-primary-foreground/15 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-display font-bold text-lg text-primary-foreground leading-none mb-0.5">Send</p>
                <p className="text-xs text-primary-foreground/60">Transfer money</p>
              </div>
            </div>
          </Link>

          <Link href="/request/new" className="block">
            <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 hover:border-primary/30 hover:bg-accent active:scale-[0.98] transition-all duration-200 cursor-pointer h-full group">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <ArrowDownLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div>
                <p className="font-display font-bold text-lg text-foreground leading-none mb-0.5">Request</p>
                <p className="text-xs text-muted-foreground">Ask for money</p>
              </div>
            </div>
          </Link>
        </div>

        {/* ── Summary Stats ────────────────────────── */}
        <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
          <SummaryStats
            transfers={transfers}
            outgoingRequests={outgoing}
            incomingRequests={incoming}
            currentUserEmail={user.email ?? ''}
          />
        </div>

        {/* ── Quick Actions ────────────────────────── */}
        <div className="animate-fade-up" style={{ animationDelay: '160ms' }}>
          <QuickActions userId={user.uid} />
        </div>

        {/* ── Search & Filter ──────────────────────── */}
        <div className="flex gap-2 animate-fade-up" style={{ animationDelay: '200ms' }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | RequestStatus)}
            className="border border-border rounded-md px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* ── Requests Tabs ────────────────────────── */}
        <div className="animate-fade-up" style={{ animationDelay: '240ms' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-display font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Requests
            </p>
            <Link
              href="/history"
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              Full History
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <Tabs defaultValue="outgoing">
            <TabsList className="w-full bg-card border border-border">
              <TabsTrigger value="outgoing" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">
                Sent
                {outgoing.length > 0 && (
                  <span className="ml-1.5 text-[10px] bg-current/20 rounded-full px-1.5 py-0.5 leading-none">
                    {outgoing.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="incoming" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">
                Received
                {pendingIncomingCount > 0 && (
                  <span className="ml-1.5 text-[10px] bg-emerald-500/20 text-emerald-400 rounded-full px-1.5 py-0.5 leading-none">
                    {pendingIncomingCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">
                Transfers
                {transfers.length > 0 && (
                  <span className="ml-1.5 text-[10px] bg-current/20 rounded-full px-1.5 py-0.5 leading-none">
                    {transfers.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="outgoing" className="space-y-2.5 mt-3">
              {outLoading ? (
                Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
              ) : filteredOutgoing.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  {search || statusFilter !== 'all' ? (
                    <p className="text-sm">No requests match your filter.</p>
                  ) : (
                    <>
                      <p className="text-sm mb-3">You haven&apos;t sent any requests yet.</p>
                      <Link href="/request/new">
                        <Button variant="outline" size="sm" className="border-border">
                          Send a Request →
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              ) : (
                filteredOutgoing.map((r) => <RequestCard key={r.id} request={r} variant="outgoing" />)
              )}
            </TabsContent>

            <TabsContent value="incoming" className="space-y-2.5 mt-3">
              {inLoading ? (
                Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
              ) : filteredIncoming.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  {search || statusFilter !== 'all' ? (
                    <p className="text-sm">No requests match your filter.</p>
                  ) : (
                    <p className="text-sm">No one has requested money from you.</p>
                  )}
                </div>
              ) : (
                filteredIncoming.map((r) => <RequestCard key={r.id} request={r} variant="incoming" />)
              )}
            </TabsContent>

            <TabsContent value="activity" className="space-y-2.5 mt-3">
              {transfersLoading ? (
                Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
              ) : transfers.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="text-sm mb-3">No transfers yet.</p>
                  <Link href="/send">
                    <Button variant="outline" size="sm" className="border-border">
                      Send Money →
                    </Button>
                  </Link>
                </div>
              ) : (
                transfers.map((t) => (
                  <TransferCard key={t.id} transfer={t} currentUserEmail={user.email ?? ''} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="pb-6" />
      </div>
    </div>
  );
}
