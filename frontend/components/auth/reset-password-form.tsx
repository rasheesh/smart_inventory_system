'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { resetPassword } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!tokenFromUrl) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(tokenFromUrl, password);
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!tokenFromUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <Card className="border border-border shadow-lg">
            <div className="p-8 space-y-4">
              <p className="text-muted-foreground">InvSys PH - Smart Inventory System</p>
              <div className="flex items-start gap-2 bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p className="text-sm">
                  This reset link is invalid or missing. Request a new link from the forgot
                  password page.
                </p>
              </div>
              <Link
                href="/forgot-password"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Request new reset link
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card className="border border-border shadow-lg">
          <div className="p-8">
            <div className="mb-8">
              <p className="text-muted-foreground">InvSys PH - Smart Inventory System</p>
              <h1 className="text-xl font-semibold text-foreground mt-2">Set new password</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a strong password with at least 8 characters.
              </p>
            </div>

            {isSuccess ? (
              <div className="space-y-4">
                <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">
                    Your password has been updated. You can now sign in with your new password.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    New password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="w-full pr-10"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      disabled={isLoading}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Confirm password
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      className="w-full pr-10"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((p) => !p)}
                      disabled={isLoading}
                      aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Password match indicator */}
                {confirmPassword && (
                  <p className={`text-xs ${password === confirmPassword ? 'text-green-600' : 'text-destructive'}`}>
                    {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </p>
                )}

                {error && (
                  <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
                  className="w-full"
                >
                  {isLoading ? 'Updating...' : 'Update password'}
                </Button>

                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
