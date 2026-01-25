"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  address: string;
  chainId: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = () => {
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('strata_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = async () => {
    setLoading(true);
    try {
      // Mock Web3 Login - Replace with Wagmi/Ethers logic later
      // In a real app, this would trigger wallet connection
      const mockUser = {
        address: '0x71C...9A23',
        chainId: 8453, // Base
      };
      
      setUser(mockUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('strata_user', JSON.stringify(mockUser));
      }
      router.push('/dashboard');
    } catch (error) {
      console.error('Login failed', error);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('strata_user');
    }
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      loading, 
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
