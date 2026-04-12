'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { validateEmail } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Check, Mail } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (searchParams.get('error') === 'invalid-link') {
      toast.error('Sign-in link is invalid or expired. Please request a new one.');
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError('');
    setSending(true);

    try {
      await sendSignInLinkToEmail(auth, email, {
        url: `${window.location.origin}/`,
        handleCodeInApp: true,
      });
      window.localStorage.setItem('emailForSignIn', email);
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {/* Ambient decorative orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-extrabold text-foreground tracking-tight">
            Pay<span className="text-primary">•</span>Request
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Request money from anyone, instantly.</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Check className="w-7 h-7 text-emerald-400" strokeWidth={2.5} />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground mb-2">Check your email</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We sent a sign-in link to{' '}
                <span className="font-medium text-foreground">{email}</span>.
                Click the link in the email to sign in.
              </p>
              <button
                className="mt-6 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                onClick={() => setSent(false)}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground leading-none mb-0.5">Sign in</h2>
                  <p className="text-xs text-muted-foreground">No password needed</p>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground/80 mb-1.5">
                    Email address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError('');
                    }}
                    className={`bg-input border-border ${emailError ? 'border-destructive' : ''}`}
                    autoComplete="email"
                    autoFocus
                  />
                  {emailError && (
                    <p className="mt-1 text-sm text-destructive">{emailError}</p>
                  )}
                </div>
                <Button type="submit" className="w-full font-display font-semibold" size="lg" disabled={sending}>
                  {sending ? 'Sending...' : 'Send sign-in link'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
