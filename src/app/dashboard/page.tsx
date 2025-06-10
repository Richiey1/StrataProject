'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '../../contexts/WalletContext';

export default function Dashboard() {
  const router = useRouter();
  const { isAuthenticated } = useWallet();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const role = localStorage.getItem('role');
    console.log('Dashboard - Role:', role);

    // Redirect based on role
    switch (role) {
      case 'admin':
        router.push('/dashboard/admin');
        break;
      case 'owner':
        router.push('/dashboard/token-creator');
        break;
      case 'user':
        router.push('/dashboard/token-trader');
        break;
      default:
        // If no role is found, redirect to role selection
        router.push('/role-selection');
    }
  }, [isAuthenticated, router]);

  // Loading state
  return (
    <div className="min-h-screen bg-[#1A0D23] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white text-lg">Loading your dashboard...</p>
      </div>
    </div>
  );
}
