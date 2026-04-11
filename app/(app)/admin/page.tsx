'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, parseCurrencyInput } from '@/lib/utils';
import { validateEmail } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, Plus, UserPlus, Wallet, Users, RefreshCw } from 'lucide-react';

interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  balanceCents: number;
  createdAt: { _seconds: number };
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Create user form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newBalanceDisplay, setNewBalanceDisplay] = useState('');
  const [newBalanceCents, setNewBalanceCents] = useState(0);
  const [creating, setCreating] = useState(false);

  // Set balance
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [balanceDisplay, setBalanceDisplay] = useState('');
  const [balanceCents, setBalanceCents] = useState(0);
  const [settingBalance, setSettingBalance] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!auth.currentUser) return;
    setLoadingUsers(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchUsers();
  }, [user, fetchUsers]);

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

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim() || !validateEmail(newEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    setCreating(true);
    try {
      const token = await auth.currentUser!.getIdToken();
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newEmail.trim(),
          displayName: newName.trim() || undefined,
          balanceCents: newBalanceCents > 0 ? newBalanceCents : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to create user');
        return;
      }

      toast.success(`User ${data.email} created!`);
      setNewEmail('');
      setNewName('');
      setNewBalanceDisplay('');
      setNewBalanceCents(0);
      setShowCreateForm(false);
      fetchUsers();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setCreating(false);
    }
  }

  async function handleSetBalance(uid: string) {
    setSettingBalance(true);
    try {
      const token = await auth.currentUser!.getIdToken();
      const res = await fetch('/api/admin/users/set-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid, balanceCents }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to set balance');
        return;
      }

      toast.success(`Balance updated to ${formatCurrency(balanceCents)}`);
      setEditingUid(null);
      setBalanceDisplay('');
      setBalanceCents(0);
      fetchUsers();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSettingBalance(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-700" />
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              disabled={loadingUsers}
              className="gap-1"
            >
              <RefreshCw className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="gap-1"
            >
              <UserPlus className="w-4 h-4" />
              New User
            </Button>
          </div>
        </div>

        {showCreateForm && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <Input
                  type="text"
                  placeholder="John Doe"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Balance <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    $
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={newBalanceDisplay}
                    onChange={(e) => {
                      setNewBalanceDisplay(e.target.value);
                      setNewBalanceCents(parseCurrencyInput(e.target.value));
                    }}
                    className="pl-7"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={creating} className="gap-1">
                  {creating ? 'Creating...' : 'Create User'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-sm text-gray-500">
              {loadingUsers ? 'Loading...' : `${users.length} registered user${users.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {loadingUsers ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No users found.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {users.map((u) => (
                <div key={u.uid} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{u.displayName}</p>
                      <p className="text-sm text-gray-500 truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Wallet className="w-3.5 h-3.5 text-gray-400" />
                          <span
                            className={`text-sm font-semibold ${
                              u.balanceCents > 0 ? 'text-green-700' : 'text-gray-400'
                            }`}
                          >
                            {formatCurrency(u.balanceCents)}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (editingUid === u.uid) {
                            setEditingUid(null);
                          } else {
                            setEditingUid(u.uid);
                            const display = (u.balanceCents / 100).toFixed(2);
                            setBalanceDisplay(display);
                            setBalanceCents(u.balanceCents);
                          }
                        }}
                        className="text-xs"
                      >
                        {editingUid === u.uid ? 'Cancel' : 'Set Balance'}
                      </Button>
                    </div>
                  </div>

                  {editingUid === u.uid && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">
                          $
                        </span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={balanceDisplay}
                          onChange={(e) => {
                            setBalanceDisplay(e.target.value);
                            setBalanceCents(parseCurrencyInput(e.target.value));
                          }}
                          className="pl-7 h-9 text-sm"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSetBalance(u.uid)}
                        disabled={settingBalance}
                      >
                        {settingBalance ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
