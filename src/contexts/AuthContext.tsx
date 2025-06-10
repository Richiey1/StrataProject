'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

// Define your API URL
const API_URL = 'https://strataforge.buyinbytes.com/api';

// Define the type for the user
type User = {
  id: string;
  walletAddress?: string;
  name?: string;
  email?: string;
  role?: string;
  verificationStatus?: string;
  phoneNumber?: string;
  createdAt?: string;
  // Add other user properties as needed
};

interface AuthData {
  token: string;
  user: User;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

type LoginResponse = ApiResponse<AuthData>;

// Define the type for the auth context
type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  role: string;
  register: (userData: {
    walletAddress: string;
    name: string;
    email: string;
    role?: string;
  }) => Promise<LoginResponse>;
  verifyEmail: (verificationData: {
    email: string;
    otp: string;
  }) => Promise<LoginResponse>;
  resendOtp: (email: string) => Promise<ApiResponse<{ message: string }>>;
  login: (credentials: { walletAddress: string }) => Promise<LoginResponse>;
};

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string>('');

  // Initialize axios with token if it exists
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    }
  }, []);

  // Check for existing token on initial load (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const storedRole = localStorage.getItem('role');

      if (token && storedRole) {
        setRole(storedRole);
      }
    }
  }, []);

  // Login user
  const login = async (credentials: { walletAddress: string }): Promise<LoginResponse> => {
    setLoading(true);
    try {
      const response = await axios.post<LoginResponse>(`${API_URL}/auth/login`, credentials);
      const loginResponse = response.data;
      console.log('Full login response:', response);
      console.log('Login response data:', loginResponse);
      console.log('Login response structure:', {
        success: loginResponse.success,
        message: loginResponse.message,
        hasData: loginResponse.data !== undefined,
        fullStructure: JSON.stringify(loginResponse, null, 2)
      });

      if (!loginResponse.success || !loginResponse.data) {
        console.error('Invalid response format:', loginResponse);
        throw new Error('Invalid response format: missing success or data');
      }

      const { token, user: userData } = loginResponse.data;

      if (!token || !userData) {
        console.error('Invalid response format:', loginResponse);
        throw new Error('Invalid response format: missing token or user data');
      }

      // Store auth data
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
        localStorage.setItem('role', userData.role || 'user');
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      setUser(userData);
      setRole(userData.role || 'user');
      setError(null);
      
      return loginResponse;
    } catch (error: unknown) {
      const err = error as AuthError;
      console.error('Login error:', err);
      console.error('Login error response:', err.response);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        delete axios.defaults.headers.common['Authorization'];
      }
      setError(err.response?.data?.message || err.message || 'Authentication failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Register user
  const register = async (userData: {
    walletAddress: string;
    name: string;
    email: string;
    role?: string;
  }): Promise<LoginResponse> => {
    setLoading(true);
    try {
      const response = await axios.post<LoginResponse>(`${API_URL}/auth/register`, {
        walletAddress: userData.walletAddress,
        name: userData.name,
        email: userData.email,
        role: userData.role || 'user'
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('registrationEmail', userData.email);
        localStorage.setItem('userRole', userData.role || 'user');
      }

      setError(null);
      return response.data;
    } catch (error: unknown) {
      const err = error as AuthError;
      setError(err.response?.data?.message || err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Verify email with OTP
  const verifyEmail = async (verificationData: {
    email: string;
    otp: string;
  }): Promise<LoginResponse> => {
    setLoading(true);
    try {
      const response = await axios.post<LoginResponse>(
        `${API_URL}/auth/verify-email`,
        verificationData
      );
      
      const authData = response.data.data;

      if (!authData) {
        throw new Error('Invalid response format: auth data is undefined');
      }

      const { token, user: userData } = authData;

      if (!token || !userData) {
        throw new Error('Invalid response format: missing token or user data');
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
        const userRole = userData.role || localStorage.getItem('userRole') || 'user';
        localStorage.setItem('role', userRole);
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        localStorage.removeItem('registrationEmail');
        localStorage.removeItem('userRole');
      }

      setUser(userData);
      setRole(userData.role || 'user');
      setError(null);

      return response.data;
    } catch (error: unknown) {
      const err = error as AuthError;
      setError(err.response?.data?.message || err.message || 'Verification failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const resendOtp = async (email: string): Promise<ApiResponse<{ message: string }>> => {
    setLoading(true);
    try {
      const response = await axios.post<ApiResponse<{ message: string }>>(`${API_URL}/auth/resend-otp`, { email });
      setError(null);
      return response.data;
    } catch (error: unknown) {
      const err = error as AuthError;
      setError(err.response?.data?.message || err.message || 'Failed to resend OTP');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        setError,
        role,
        register,
        verifyEmail,
        resendOtp,
        login,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};