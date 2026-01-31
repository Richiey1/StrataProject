"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the admin context type
type AdminContextType = {
  loading: boolean;
  error: string | null;
  dashboard: any | null;
  orders: any[];
  customers: any[];
  categories: any[];
  
  getDashboard: () => Promise<void>;
  getOrders: (params?: any) => Promise<void>;
  getCustomers: (params?: any) => Promise<void>;
  getCategories: () => Promise<void>;
  createCategory: (data: any) => Promise<void>;
  updateOrderStatus: (id: string, status: string) => Promise<void>;
};

const AdminContext = createContext<AdminContextType | null>(null);

const API_URL_ADMIN = process.env.NEXT_PUBLIC_API_URL_ADMIN || 'http://your-api-url/admin';

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Helper for authorized admin requests
  const handleRequest = async (endpoint: string, options: RequestInit = {}) => {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
      const response = await fetch(`${API_URL_ADMIN}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (err: any) {
      const msg = err.message || 'An unexpected error occurred';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getDashboard = async () => {
    try {
      const data = await handleRequest('/dashboard');
      setDashboard(data);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    }
  };

  const getOrders = async (params?: any) => {
    try {
      const query = params ? `?${new URLSearchParams(params).toString()}` : '';
      const data = await handleRequest(`/orders${query}`);
      setOrders(data || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  };

  const getCustomers = async (params?: any) => {
    try {
      const query = params ? `?${new URLSearchParams(params).toString()}` : '';
      const data = await handleRequest(`/customers${query}`);
      setCustomers(data || []);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const getCategories = async () => {
    try {
      const data = await handleRequest('/categories');
      setCategories(data || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const createCategory = async (data: any) => {
    await handleRequest('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await getCategories(); // Refresh list
  };

  const updateOrderStatus = async (id: string, status: string) => {
    await handleRequest(`/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    // Optimistically update or refresh orders
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  return (
    <AdminContext.Provider
      value={{
        loading,
        error,
        dashboard,
        orders,
        customers,
        categories,
        getDashboard,
        getOrders,
        getCustomers,
        getCategories,
        createCategory,
        updateOrderStatus,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === null) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
