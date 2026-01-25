"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ApiContextType {
  loading: boolean;
  error: string | null;
  fetchData: <T>(url: string, options?: RequestInit) => Promise<T | null>;
  clearError: () => void;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export function ApiProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async <T>(url: string, options?: RequestInit): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <ApiContext.Provider value={{ loading, error, fetchData, clearError }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApi() {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
}
