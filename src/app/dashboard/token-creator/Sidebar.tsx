'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '../../../contexts/WalletContext';
import { useReadContract } from 'wagmi';
import { Abi } from 'viem';
import StrataForgeAdminABI from '../../../app/components/ABIs/StrataForgeAdminABI.json';

const ADMIN_CONTRACT_ADDRESS = '0x7e8541Ba29253C1722d366e3d08975B03f3Cc839' as const;
const adminABI = StrataForgeAdminABI as Abi;

interface SidebarLinkProps {
  href: string;
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
        <div className='w-6 h-6 mr-3 flex items-center justify-center'>{icon}</div>
        <span className='font-inter font-normal text-base leading-[25px]'>{text}</span>
      </button>
    );
  }

  return (
    <Link
      href={href}
      className={`flex items-center px-4 py-3 ${
        active ? 'bg-[hsl(var(--foreground)/0.1)]' : 'hover:bg-[hsl(var(--foreground)/0.05)]'
      } transition-colors rounded-lg my-1`}
    >
      <div className='w-6 h-6 mr-3 flex items-center justify-center'>{icon}</div>
      <span className='font-inter font-normal text-base leading-[25px]'>{text}</span>
    </Link>
  );
};

const DashboardSidebar = () => {
  const { isConnected, disconnect, connect, address } = useWallet();
  const pathname = usePathname();
  const currentPath = pathname || '/dashboard';
  const [isAirdropOpen, setIsAirdropOpen] = useState(false);
  const [subscription, setSubscription] = useState<{
    plan: string;
    tokensRemaining: number;
    expiry: number;
  } | null>(null);
  const [selectedTokenId, setSelectedTokenId] = useState<string>('');

  // Fetch subscription status
  const { data: subData } = useReadContract({
    address: ADMIN_CONTRACT_ADDRESS,
    abi: adminABI,
    functionName: 'getSubscription',
    args: [address],
    query: { enabled: isConnected && !!address, retry: 3, retryDelay: 1000 },
  });

  // Load selected token from local storage
  useEffect(() => {
    const storedTokenId = localStorage.getItem('selectedTokenId');
    if (storedTokenId) {
      setSelectedTokenId(storedTokenId);
    }
  }, []);

  // Process subscription data
  useEffect(() => {
    if (!isConnected || !address || !subData) {
      setSubscription(null);
      return;
    }

    const planNames = ['Free', 'Classic', 'Pro', 'Premium'];
    const [tierIndex, expiry, tokensThisMonth] = subData as [bigint, bigint, bigint];
    const planName = planNames[Number(tierIndex)] || 'Free';
    const tokenLimits: { [key: string]: number } = {
      Free: 2,
      Classic: 5,
      Pro: 10,
      Premium: Infinity,
    };
    const maxTokens = tokenLimits[planName];
    const remainingTokens = Math.max(0, maxTokens - Number(tokensThisMonth));

    setSubscription({
      plan: planName,
      tokensRemaining: remainingTokens,
      expiry: Number(expiry) * 1000,
    });
  }, [isConnected, address, subData]);

  const handleDisconnect = () => {
    try {
      disconnect();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('walletconnect');
        localStorage.removeItem('selectedTokenId');
      }
      window.location.href = '/';
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Connect error:', error);
    }
  };

  const handleAirdropClick = () => {
    if (!isConnected) {
      alert('Please connect your wallet to access airdrop features.');
      return;
    }
    if (subscription?.plan !== 'Premium') {
      alert('This feature is only available for Premium subscribers. Please upgrade your plan.');
      return;
    }
    setIsAirdropOpen(!isAirdropOpen);
  };

  const handleDistributeClick = () => {
    if (!selectedTokenId) {
      alert('Please select a token first from the dashboard.');
    }
  };

  return (
    <aside className='w-64 h-auto min-h-2/5 transition-transform duration-300 ease-in-out'>
      <div className='h-full inset-shadow-[0px_0px_10px_0px_hsl(var(--foreground)/0.25)] backdrop-blur-[30px] bg-[#201726] flex flex-col'>
        <div className='p-4 flex flex-col h-full'>
          <div className='flex items-center mb-8'>
            <div className='text-xl font-bold flex items-center'>
              <span className='text-[hsl(var(--primary-from))] mr-1'>Strata</span>
              <span className='text-[hsl(var(--foreground))]'>Forge</span>
            </div>
          </div>
          <div className='flex items-center gap-2 mb-8 px-4'>
            <div className='w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-600 flex items-center justify-center'>
              <svg className='w-4 h-4 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                />
              </svg>
            </div>
            <div className='flex flex-col'>
              <span className='font-inter text-sm font-medium'>Token Creator</span>
              {isConnected ? (
                <div className='flex items-center gap-1'>
                  <div className='w-1.5 h-1.5 bg-green-400 rounded-full'></div>
                  <span className='font-mono text-xs text-gray-400'>Connected</span>
                </div>
              ) : (
                <div className='flex items-center gap-1'>
                  <div className='w-1.5 h-1.5 bg-red-400 rounded-full'></div>
                  <span className='font-mono text-xs text-gray-400'>Not Connected</span>
                </div>
              )}
            </div>
          </div>
          <nav className='space-y-1 flex-grow'>
            <SidebarLink
              href="/dashboard/token-creator"
              icon={
                <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'>
                  <path d='M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4z' />
                  <path d='M3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6z' />
                </svg>
              }
              text='Dashboard'
              active={currentPath === '/dashboard/token-creator'}
            />
            <SidebarLink
              href='/dashboard/token-creator/manage-subscription'
              icon={
                <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'>
                  <path
                    fillRule='evenodd'
                    d='M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM2 9v5a2 2 0 002 2h12a2 2 0 002-2V9H2zm2 4a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z'
                    clipRule='evenodd'
                  />
                </svg>
              }
              text='Manage Subscription'
              active={currentPath === '/dashboard/token-creator/manage-subscription'}
            />
            <SidebarLink
              href='/dashboard/token-creator/create-tokens'
              icon={
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='h-5 w-5'
                  viewBox='0 0 20 20'
                  fill='currentColor'
                >
                  <path
                    fillRule='evenodd'
                    d='M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9V6a1 1 0 112 0v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3z'
                    clipRule='evenodd'
                  />
                </svg>
              }
              text='Create Tokens'
              active={currentPath === '/dashboard/token-creator/create-tokens'}
            />
            <div>
              <button
                onClick={handleAirdropClick}
                className={`w-full flex items-center px-4 py-3 ${
                  isAirdropOpen || currentPath.startsWith('/dashboard/token-creator/airdrop-listing')
                    ? 'bg-[hsl(var(--foreground)/0.1)]'
                    : 'hover:bg-[hsl(var(--foreground)/0.05)]'
                } transition-colors rounded-lg my-1 text-left`}
              >
                <div className='w-6 h-6 mr-3 flex items-center justify-center'>
                  <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'>
                    <path
                      fillRule='evenodd'
                      d='M10 2v6m0 4v6m-6-6h12M4 10l2 2m8-2l-2 2'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                </div>
                <span className='font-inter font-normal text-base leading-[25px]'>Create Airdrop</span>
                <svg
                  className={`ml-auto h-5 w-5 transform ${isAirdropOpen ? 'rotate-180' : ''}`}
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                </svg>
              </button>
              {isAirdropOpen && subscription?.plan === 'Premium' && (
                <div className='ml-6 space-y-1'>
                  <SidebarLink
                    href='/dashboard/token-creator/airdrop-listing/upload'
                    icon={
                      <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'>
                        <path d='M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z' />
                        <path
                          fillRule='evenodd'
                          d='M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z'
                          clipRule='evenodd'
                        />
                      </svg>
                    }
                    text='Upload Whitelisted CSV'
                    active={currentPath === '/dashboard/token-creator/airdrop-listing/upload'}
                  />
                  <SidebarLink
                    href={selectedTokenId ? `/dashboard/token-creator/airdrop-listing/distribute/${selectedTokenId}` : '#'}
                    icon={
                      <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'>
                        <path d='M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894 l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z' />
                      </svg>
                    }
                    text='Distribute Airdrop'
                    active={currentPath === `/dashboard/token-creator/airdrop-listing/distribute/${selectedTokenId}`}
                    onClick={!selectedTokenId ? handleDistributeClick : undefined}
                  />
                  <SidebarLink
                    href='/dashboard/token-creator/airdrop-listing/claim'
                    icon={
                      <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'>
                        <path d='M9 2a1 1 0 000 2h2a1 1 0 100-2H9z' />
                        <path
                          fillRule='evenodd'
                          d='M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z'
                          clipRule='evenodd'
                        />
                      </svg>
                    }
                    text='Claim Airdrop'
                    active={currentPath === '/dashboard/token-creator/airdrop-listing/claim'}
                  />
                </div>
              )}
            </div>
            <SidebarLink
              href='/dashboard/tokens'
              icon={
                <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'>
                  <path
                    fillRule='evenodd'
                    d='M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 3h8a1 1 0 011 1v4a1 1 0 01-1 1H6a1 1 0 01-1-1V8a1 1 0 011-1z'
                    clipRule='evenodd'
                  />
                </svg>
              }
              text='Token Wallet'
              active={currentPath === '/dashboard/tokens'}
            />
            <SidebarLink
              href='/profile'
              icon={
                <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'>
                  <path
                    fillRule='evenodd'
                    d='M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z'
                    clipRule='evenodd'
                  />
                </svg>
              }
              text='My Profile'
              active={currentPath === '/profile'}
            />
          </nav>
          <div className='mt-auto pt-4 border-t border-gray-700/30'>
            <SidebarLink
              href='/support'
              icon={
                <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'>
                  <path
                    fillRule='evenodd'
                    d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z'
                    clipRule='evenodd'
                  />
                </svg>
              }
              text='Help & Support'
              active={currentPath === '/support'}
            />
            <SidebarLink
              href='#'
              icon={
                <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'>
                  <path
                    fillRule='evenodd'
                    d='M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm1 2v10h10V5H4zm4 4a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z'
                    clipRule='evenodd'
                  />
                </svg>
              }
              text={isConnected ? 'Log Out' : 'Connect Wallet'}
              active={false}
              onClick={isConnected ? handleDisconnect : handleConnect}
            />
          </div>
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;