import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user;
  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';

  const login = useCallback(
    async (callbackUrl?: string) => {
      try {
        const result: any = await signIn(undefined, {
          callbackUrl: callbackUrl || '/',
          redirect: false,
        });

        if (result?.url && !result?.error) {
          router.push(result.url);
        } else if (!result?.error) {
          router.push(callbackUrl || '/');
        }
      } catch (error) {
        console.error('Login error:', error);
      }
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      // Sign out without redirect to prevent window.location issues
      await signOut({ redirect: false });

      // Use Next.js router for clean navigation
      router.push('/');
      router.refresh(); // Refresh to clear any cached auth state
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: still redirect to home
      router.push('/');
    }
  }, [router]);

  const requireAuth = useCallback(
    (redirectTo?: string) => {
      if (!isLoading && !isAuthenticated) {
        const callbackUrl = redirectTo || window.location.pathname;
        router.push(
          `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
        );
        return false;
      }
      return isAuthenticated;
    },
    [isLoading, isAuthenticated, router]
  );

  return {
    user,
    session,
    isAuthenticated,
    isLoading,
    login,
    logout,
    requireAuth,
  };
}
