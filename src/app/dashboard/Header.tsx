// app/dashboard/Header.tsx
'use client';
import React, { useState } from 'react';
import { useWallet } from '../../contexts/WalletContext';

interface HeaderProps {
  toggleSidebar: () => void;
  isConnected: boolean;
}

const DashboardHeader: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const { address, isConnected, connect } = useWallet();

  const displayAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  return (
    <header className='flex justify-between items-center p-4 md:px-8 md:py-4 bg-[--header-background] border-b border-[hsl(var(--border))]'>
      <div className='flex items-center'>
        <button
          className='md:hidden mr-3 text-[hsl(var(--foreground))]'
          onClick={toggleSidebar}
          aria-label='Toggle sidebar'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-6 w-6'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M4 6h16M4 12h16M4 18h16'
            />
          </svg>
        </button>
        <div className='hidden md:block relative w-80'>
          <input
            type='text'
            placeholder='Search.....'
            className='w-full py-2 px-4 rounded-3xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary-from))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]'
          />
        </div>
        <button
          className='md:hidden text-[hsl(var(--foreground))]'
          onClick={() => setIsSearchExpanded(!isSearchExpanded)}
          aria-label={isSearchExpanded ? 'Close search' : 'Open search'}
        >
          {isSearchExpanded ? (
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-6 w-6'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          ) : (
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-6 w-6'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
              />
            </svg>
          )}
        </button>
      </div>
      <div className='flex items-center space-x-2 md:space-x-4'>
        {isConnected ? (
          <div className='text-xs md:text-sm px-2 md:px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--primary-from))]/10'>
            <span className='hidden xs:inline'>Wallet: </span>
            {displayAddress}
          </div>
        ) : (
          <button
            onClick={connect}
            className='text-xs md:text-sm px-2 md:px-4 py-2 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--primary-from))]/10 transition'
          >
            Connect Wallet
          </button>
        )}
        <button className='px-3 md:px-7 py-2 text-[hsl(var(--foreground))] text-sm md:text-base font-medium rounded-3xl bg-gradient-to-r from-[hsl(var(--primary-from))] to-[hsl(var(--primary-to))] hover:opacity-90 transition'>
          <span className='hidden md:inline'>Find </span>Tokens
        </button>
      </div>
      {isSearchExpanded && (
        <div className='absolute top-16 left-0 right-0 px-4 z-10 md:hidden'>
          <input
            type='text'
            placeholder='Search airdrops...'
            className='w-full py-2 px-4 rounded-3xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary-from))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] bg-[--header-background]'
            autoFocus
          />
        </div>
      )}
    </header>
  );
};

export default DashboardHeader;
