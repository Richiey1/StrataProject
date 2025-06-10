'use client';

import { wagmiAdapter, projectId } from '../config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { mainnet, arbitrum, liskSepolia, baseSepolia } from '@reown/appkit/networks';
import React, { type ReactNode } from 'react';
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi';
// import { baseSepolia } from '../lib/wagmi-config';

// Set up queryClient
const queryClient = new QueryClient();

if (!projectId) {
  throw new Error('Project ID is not defined');
}

// Set up metadata
const metadata = {
  name: 'StrataForge',
  description: 'StrataForge Token Creation Platform',
  url: 'https://strataforge.buyinbytes.com',
  icons: ['https://strataforge.buyinbytes.com/strataforge-logo.png'],
};

// Create the modal
const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [mainnet, arbitrum, baseSepolia, liskSepolia],
  defaultNetwork: baseSepolia,
  metadata: metadata,
  features: {
    analytics: true,
  },
});

console.log('AppKit modal created:', modal);

function ContextProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies);

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

export default ContextProvider;
