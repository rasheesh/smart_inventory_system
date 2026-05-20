'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { MainLayout } from './main-layout';
import { Spinner } from '@/components/ui/spinner';

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Public routes that don't require authentication
  const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password'];
  const isPublicPage = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '?'));

  useEffect(() => {
    // If user is on a public page and authenticated, redirect to dashboard
    if (isPublicPage && isAuthenticated && !isLoading) {
      router.push('/');
    }
    // If user is not on a public page and not authenticated, redirect to login
    if (!isPublicPage && !isAuthenticated && !isLoading) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, isPublicPage, router, pathname]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Spinner />
      </div>
    );
  }

  // If on a public page, render without MainLayout
  if (isPublicPage) {
    return <>{children}</>;
  }

  // If authenticated, render with MainLayout
  if (isAuthenticated) {
    return <MainLayout>{children}</MainLayout>;
  }

  // Fallback (should not reach here due to redirect)
  return null;
}
