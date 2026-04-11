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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, LogOut, Wallet, Send } from 'lucide-react';
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
    <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
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
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.replace('/login');
    return null;
  }

  const filteredOutgoing = filterRequests(outgoing, search, statusFilter);
  const filteredIncoming = filterRequests(incoming, search, statusFilter);

  async function handleSignOut() {
    await signOut(auth);
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">PayRequest</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAddFundsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
              title="Add Funds"
            >
              <Wallet className="w-4 h-4 text-green-700" />
              <span className={`text-sm font-semibold ${wallet && wallet.balanceCents > 0 ? 'text-green-700' : 'text-gray-500'}`}>
                {wallet ? formatCurrency(wallet.balanceCents) : '...'}
              </span>
            </button>
            <Link href="/send">
              <Button size="sm" variant="outline" className="gap-1">
                <Send className="w-4 h-4" /> Send
              </Button>
            </Link>
            <Link href="/request/new">
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" /> Request
              </Button>
            </Link>
            <button
              onClick={handleSignOut}
              className="text-gray-400 hover:text-gray-700 p-1"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <AddFundsDialog open={addFundsOpen} onOpenChange={setAddFundsOpen} />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | RequestStatus)}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <Tabs defaultValue="outgoing">
          <TabsList className="w-full">
            <TabsTrigger value="outgoing" className="flex-1">
              Outgoing
              {outgoing.length > 0 && (
                <span className="ml-1.5 text-xs bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5">
                  {outgoing.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="incoming" className="flex-1">
              Incoming
              {incoming.filter((r) => r.status === 'pending').length > 0 && (
                <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5">
                  {incoming.filter((r) => r.status === 'pending').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-1">
              Activity
              {transfers.length > 0 && (
                <span className="ml-1.5 text-xs bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5">
                  {transfers.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="outgoing" className="space-y-3 mt-4">
            {outLoading ? (
              Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
            ) : filteredOutgoing.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                {search || statusFilter !== 'all' ? (
                  <p>No requests match your filter.</p>
                ) : (
                  <>
                    <p className="mb-3">You haven&apos;t sent any requests yet.</p>
                    <Link href="/request/new">
                      <Button variant="outline" size="sm">Send a Request →</Button>
                    </Link>
                  </>
                )}
              </div>
            ) : (
              filteredOutgoing.map((r) => <RequestCard key={r.id} request={r} variant="outgoing" />)
            )}
          </TabsContent>

          <TabsContent value="incoming" className="space-y-3 mt-4">
            {inLoading ? (
              Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
            ) : filteredIncoming.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                {search || statusFilter !== 'all' ? (
                  <p>No requests match your filter.</p>
                ) : (
                  <p>No one has requested money from you.</p>
                )}
              </div>
            ) : (
              filteredIncoming.map((r) => <RequestCard key={r.id} request={r} variant="incoming" />)
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-3 mt-4">
            {transfersLoading ? (
              Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
            ) : transfers.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="mb-3">No transfers yet.</p>
                <Link href="/send">
                  <Button variant="outline" size="sm">Send Money →</Button>
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
    </div>
  );
}
