'use client';

import { useState } from 'react';
import Link from 'next/link';
import { requestPasswordReset } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await requestPasswordReset(email.trim());
      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card className="border border-border shadow-lg">
          <div className="p-8">
            <div className="mb-8">
              <p className="text-muted-foreground">InvSys PH - Smart Inventory System</p>
              <h1 className="text-xl font-semibold text-foreground mt-2">Forgot password</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your account email and we&apos;ll send reset instructions.
              </p>
            </div>

            {isSubmitted ? (
              <div className="space-y-4">
                <div className="flex items-start gap-2 bg-primary/10 text-primary px-4 py-3 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">
                    If an account exists with that email, you will receive password reset
                    instructions shortly. Check your inbox and spam folder.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="w-full"
                    required
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <Button type="submit" disabled={isLoading || !email.trim()} className="w-full">
                  {isLoading ? 'Sending...' : 'Send reset link'}
                </Button>

                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
              </form>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}