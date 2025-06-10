'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '../../../contexts/WalletContext';
import { useReadContract, useReadContracts } from 'wagmi';
import { Abi } from 'viem';
import StrataForgeAdminABI from '../../../app/components/ABIs/StrataForgeAdminABI.json';

const ADMIN_CONTRACT_ADDRESS = '0xADC01DF1dA777a7fE0A93eC58BfC6b69d3354599' as const;
const adminABI = StrataForgeAdminABI as Abi;

interface SidebarLinkProps {
  href?: string; // Made href optional
  icon: React.ReactNode;
  text: string;
  active?: boolean;
  onClick?: () => void;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ href, icon, text, active, onClick }) => {
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`w-full flex items-center px-4 py-3 ${
          active ? 'bg-[hsl(var(--foreground)/0.1)]' : 'hover:bg-[hsl(var(--foreground)/0.05)]'
        } transition-colors rounded-lg my-1 text-left`}
      >
        <div className="w-6 h-6 mr-3 flex items-center justify-center">{icon}</div>
        <span className="font-inter font-normal text-base leading-[25px]">{text}</span>
      </button>
    );
  }

  return (
    <Link
      href={href ?? '#'} // Fallback to '#' if href is undefined
      className={`flex items-center px-4 py-3 ${
        active ? 'bg-[hsl(var(--foreground)/0.1)]' : 'hover:bg-[hsl(var(--foreground)/0.05)]'
      } transition-colors rounded-lg my-1`}
    >
      <div className="w-6 h-6 mr-3 flex items-center justify-center">{icon}</div>
      <span className="font-inter font-normal text-base leading-[25px]">{text}</span>
    </Link>
  );
};

const AdminSidebar = () => {
  const { address, isConnected, disconnect } = useWallet();
  const pathname = usePathname();
  const currentPath = pathname || '/dashboard/admin';
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Get admin count
  const {
    data: adminCount,
    error: adminCountError,
    isSuccess: adminCountSuccess,
  } = useReadContract({
    address: ADMIN_CONTRACT_ADDRESS,
    abi: adminABI,
    functionName: 'adminCount',
    query: {
      enabled: isConnected,
      retry: 3,
      retryDelay: 1000,
    },
  });

  // Create array of admin read calls
  const adminChecks = React.useMemo(() => {
    if (!adminCount || !isConnected || !adminCountSuccess) return [];

    const count = Number(adminCount);
    console.log('Sidebar Admin Count:', count);

    return Array.from({ length: count }, (_, i) => ({
      address: ADMIN_CONTRACT_ADDRESS as `0x${string}`,
      abi: adminABI,
      functionName: 'admin' as const,
      args: [i] as const,
    }));
  }, [adminCount, isConnected, adminCountSuccess]);

  const {
    data: adminAddresses,
    error: adminAddressesError,
    isSuccess: adminAddressesSuccess,
  } = useReadContracts({
    contracts: adminChecks,
    query: {
      enabled: adminChecks.length > 0,
      retry: 3,
      retryDelay: 1000,
    },
  });

  // Check admin status
  useEffect(() => {
    if (!address || !adminAddressesSuccess || !adminAddresses || adminAddresses.length === 0) {
      console.log('Sidebar admin check conditions not met:', {
        address: !!address,
        adminAddressesSuccess,
        adminAddressesLength: adminAddresses?.length || 0,
      });
      setIsLoading(false);
      return;
    }

    let isAdminUser = false;

    for (let i = 0; i < adminAddresses.length; i++) {
      const result = adminAddresses[i];
      console.log(`Sidebar Admin check ${i}:`, result);

      if (result && result.status === 'success' && result.result) {
        const adminAddress = result.result as string;
        console.log(`Sidebar Admin ${i}:`, adminAddress);

        if (adminAddress && adminAddress.toLowerCase() === address.toLowerCase()) {
          isAdminUser = true;
          break;
        }
      } else if (result && result.status === 'failure') {
        console.error(`Sidebar: Failed to fetch admin ${i}:`, result.error);
      }
    }

    console.log('Sidebar Is Admin:', isAdminUser);
    setIsAdmin(isAdminUser);
    setIsLoading(false);
  }, [address, adminAddresses, adminAddressesSuccess]);

  // Handle errors
  useEffect(() => {
    const errors: string[] = [];

    if (adminCountError) {
      console.error('Sidebar admin count error:', adminCountError);
      errors.push('Failed to load admin count');
    }
    if (adminAddressesError) {
      console.error('Sidebar admin addresses error:', adminAddressesError);
      errors.push('Failed to load admin addresses');
    }

    if (errors.length > 0) {
      setError(errors.join(', '));
      setIsLoading(false);
    } else {
      setError('');
    }
  }, [adminCountError, adminAddressesError]);

  // Don't render sidebar if not connected, still loading, or not admin
  if (!isConnected || isLoading || !isAdmin) {
    return null;
  }

  // Render error state
  if (error) {
    return (
      <aside className="w-64 h-auto min-h-2/5 transition-transform duration-300 ease-in-out">
        <div className="h-full inset-shadow-[0px_0px_10px_0px_hsl(var(--foreground)/0.25)] backdrop-blur-[30px] bg-[#201726] flex flex-col">
          <div className="p-4 flex flex-col h-full">
            <div className="flex items-center mb-8">
              <div className="text-xl font-bold flex items-center">
                <span className="text-[hsl(var(--primary-from))] mr-1">Strata</span>
                <span className="text-[hsl(var(--foreground))]">Forge Admin</span>
              </div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center space-x-3">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-red-300 font-medium text-sm">{error}</p>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 h-auto min-h-2/5 transition-transform duration-300 ease-in-out">
      <div className="h-full inset-shadow-[0px_0px_10px_0px_hsl(var(--foreground)/0.25)] backdrop-blur-[30px] bg-[#201726] flex flex-col">
        <div className="p-4 flex flex-col h-full">
          <div className="flex items-center mb-8">
            <div className="text-xl font-bold flex items-center">
              <span className="text-[hsl(var(--primary-from))] mr-1">Strata</span>
              <span className="text-[hsl(var(--foreground))]">Forge Admin</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-8 px-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center">
                <span className="font-inter text-sm font-medium mr-2">Admin</span>
                <div
                  className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                ></div>
              </div>
              <span className="font-mono text-xs text-gray-400">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </div>
          </div>

          <nav className="space-y-1 flex-grow">
            <SidebarLink
              href="/dashboard/admin"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              }
              text="Admin Dashboard"
              active={currentPath === '/dashboard/admin'}
            />
            <SidebarLink
              href="/dashboard/admin/manage-admins"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              }
              text="Manage Admins"
              active={currentPath === '/dashboard/admin/manage-admins'}
            />
            <SidebarLink
              href="/dashboard/admin/subscription-fees"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path
                    fillRule="evenodd"
                    d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
                    clipRule="evenodd"
                  />
                </svg>
              }
              text="Subscription Fees"
              active={currentPath === '/dashboard/admin/subscription-fees'}
            />
            <SidebarLink
              href="/dashboard/admin/withdrawals"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
              }
              text="Withdrawals"
              active={currentPath === '/dashboard/admin/withdrawals'}
            />
            <SidebarLink
              href="/dashboard/admin/contract-controls"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                    clipRule="evenodd"
                  />
                </svg>
              }
              text="Contract Controls"
              active={currentPath === '/dashboard/admin/contract-controls'}
            />
            <SidebarLink
              href="/dashboard/admin/analytics"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              }
              text="Analytics & Reports"
              active={currentPath === '/dashboard/admin/analytics'}
            />
            <div className="border-t border-gray-700/30 my-4"></div>
            <SidebarLink
              href="/dashboard"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              }
              text="User Dashboard"
              active={currentPath === '/dashboard'}
            />
            <SidebarLink
              href="/support"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
              }
              text="Help & Support"
              active={currentPath === '/support'}
            />
            <div className="border-t border-gray-700/30 my-4"></div>
            <SidebarLink
              onClick={disconnect}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                    clipRule="evenodd"
                  />
                </svg>
              }
              text="Disconnect Wallet"
              active={false}
            />
          </nav>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;