'use client';

import { ReactNode } from 'react';
import { WagmiConfig } from 'wagmi';
import { config } from './lib/wagmi-config';

import { WalletProvider } from './contexts/WalletContext';
import { ApiProvider } from './contexts/ApiContext';
import { AuthProvider } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <WagmiConfig config={config}>
      <WalletProvider>
        <ApiProvider>
          <AuthProvider>
            <AdminProvider>
              {children}
            </AdminProvider>
          </AuthProvider>
        </ApiProvider>
      </WalletProvider>
    </WagmiConfig>
  );
}
