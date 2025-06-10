'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '../../contexts/WalletContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'owner' | 'user';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isConnected } = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Wait for authentication state to be determined
        if (!isConnected) {
          setIsLoading(true);
          return;
        }

        // Check if user is authenticated
        if (!isAuthenticated) {
          console.log('User not authenticated, redirecting to home');
          router.push('/');
          setHasAccess(false);
          setIsLoading(false);
          return;
        }

        // If role check is required
        if (requiredRole) {
          const userRole = localStorage.getItem('role');
          console.log('Checking role access:', { requiredRole, userRole });
          
          // If no role found or role doesn't match
          if (!userRole || userRole !== requiredRole) {
            console.log('Invalid role, redirecting to appropriate dashboard');
            // Redirect to appropriate dashboard based on actual role
            if (userRole === 'owner') {
              router.push('/dashboard/token-creator');
            } else if (userRole === 'user') {
              router.push('/dashboard/token-trader');
            } else {
              router.push('/');
            }
            setHasAccess(false);
          } else {
            setHasAccess(true);
          }
        } else {
          // No role requirement, just need authentication
          setHasAccess(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [isAuthenticated, isConnected, requiredRole, router]);

  // Show nothing while checking authentication/authorization
  if (isLoading) {
    return null;
  }

  // Only render children if user has access
  return hasAccess ? <>{children}</> : null;
} 