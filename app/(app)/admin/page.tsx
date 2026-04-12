'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import { useAmountInput } from '@/hooks/useAmountInput';
import { validateEmail } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Wallet, Users, RefreshCw, X, Check } from 'lucide-react';

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

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const newBalanceInput = useAmountInput();
  const [creating, setCreating] = useState(false);

  const [editingUid, setEditingUid] = useState<string | null>(null);
  const editBalanceInput = useAmountInput();
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
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
          balanceCents: newBalanceInput.cents > 0 ? newBalanceInput.cents : undefined,
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
      newBalanceInput.setAmount(0);
      setShowCreateForm(false);
      fetchUsers();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setCreating(false);
    }
  }

  async function handleSetBalance(uid: string) {
    const cents = editBalanceInput.cents;
    setSettingBalance(true);
    try {
      const token = await auth.currentUser!.getIdToken();
      const res = await fetch('/api/admin/users/set-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid, balanceCents: cents }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to set balance');
        return;
      }

      toast.success(`Balance updated to ${formatCurrency(cents)}`);
      setEditingUid(null);
      editBalanceInput.setAmount(0);
      fetchUsers();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSettingBalance(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">Admin Panel</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              disabled={loadingUsers}
              className="gap-1.5 border-border"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="gap-1.5 font-display font-semibold"
            >
              {showCreateForm ? <X className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
              {showCreateForm ? 'Cancel' : 'New User'}
            </Button>
          </div>
        </div>

        {showCreateForm && (
          <div className="bg-card border border-border rounded-2xl p-6 mb-5 animate-fade-up">
            <h2 className="font-display text-lg font-bold text-foreground mb-5">Create New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                  Email <span className="text-destructive">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="bg-input border-border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                  Display Name <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Input
                  type="text"
                  placeholder="John Doe"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-input border-border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                  Initial Balance <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={newBalanceInput.display}
                    onChange={newBalanceInput.handleChange}
                    onBlur={newBalanceInput.handleBlur}
                    className="pl-7 bg-input border-border font-numeric"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={creating} className="gap-1.5 font-display font-semibold">
                  {creating ? 'Creating...' : 'Create User'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-border"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {loadingUsers ? 'Loading...' : (
                <span>
                  <span className="font-semibold text-foreground">{users.length}</span>
                  {' '}registered user{users.length !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>

          {loadingUsers ? (
            <div className="p-10 text-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">
              No users found.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {users.map((u) => (
                <div key={u.uid} className="px-6 py-4 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">{u.displayName}</p>
                      <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-muted-foreground/60" />
                        <span className={`font-numeric text-sm font-bold ${
                          u.balanceCents > 0 ? 'text-emerald-400' : 'text-muted-foreground'
                        }`}>
                          {formatCurrency(u.balanceCents)}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (editingUid === u.uid) {
                            setEditingUid(null);
                          } else {
                            setEditingUid(u.uid);
                            editBalanceInput.setAmount(u.balanceCents);
                          }
                        }}
                        className="text-xs border-border"
                      >
                        {editingUid === u.uid ? 'Cancel' : 'Set Balance'}
                      </Button>
                    </div>
                  </div>

                  {editingUid === u.uid && (
                    <div className="mt-3 flex items-center gap-2 animate-fade-up">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">$</span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={editBalanceInput.display}
                          onChange={editBalanceInput.handleChange}
                          onBlur={editBalanceInput.handleBlur}
                          className="pl-7 h-9 text-sm bg-input border-border font-numeric"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSetBalance(u.uid)}
                        disabled={settingBalance}
                        disabled={settingBalance}
                        className="gap-1 font-semibold"
                      >
                        <Check className="w-3.5 h-3.5" />
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
