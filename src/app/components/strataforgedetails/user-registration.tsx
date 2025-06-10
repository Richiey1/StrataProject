'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWallet } from '../../../contexts/WalletContext';
import { useAuth } from '../../../contexts/AuthContext';

export default function StratforgeUserRegistration() {
  const router = useRouter();
  const { address: connectedWalletAddress, isConnected } = useWallet();
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get role from localStorage on component mount
  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!isConnected || !connectedWalletAddress) {
        throw new Error('Please connect your wallet first');
      }

      const response = await register({
        walletAddress: connectedWalletAddress,
        name: fullName,
        email: email,
        role: userRole || 'user'
      });
      
      // Store email for verification page
      localStorage.setItem('registrationEmail', email);
      
      // Only redirect after successful registration
      if (response?.success) {
        router.push('/email-verification');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-[#1a0e2e] bg-gradient-to-br from-[#1a0e2e] to-[#2a1a3e] relative overflow-hidden'>
      {/* Decorative elements */}
      <div className='absolute top-1/4 left-1/4 w-4 h-4 rounded-full bg-purple-500/30 blur-xl'></div>
      <div className='absolute bottom-1/3 right-1/4 w-6 h-6 rounded-full bg-blue-500/30 blur-xl'></div>
      <div className='absolute bottom-1/4 right-1/3 w-3 h-3 rounded-full bg-purple-400/30 blur-lg'></div>

      {/* Glass card */}
      <div className='w-full max-w-md p-8 mx-4 rounded-2xl bg-[#1a0e2e]/60 backdrop-blur-md border border-[#ffffff10] shadow-xl relative'>
        {/* Logo */}
        <div className='flex justify-center mb-6'>
          <div className='w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center'>
            <svg
              width='24'
              height='24'
              viewBox='0 0 24 24'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path d='M12 4L18 8V16L12 20L6 16V8L12 4Z' stroke='white' strokeWidth='2' />
              <path d='M12 8L15 10V14L12 16L9 14V10L12 8Z' fill='white' />
            </svg>
          </div>
        </div>

        {/* Header */}
        <div className='text-center mb-6'>
          <h1 className='text-xl font-semibold text-white mb-1'>Welcome to StrataForge!</h1>
          <p className='text-sm text-gray-400'>Credentials are only used to authenticate you</p>
          {userRole && <p className='text-sm text-blue-400 mt-1'>Registering as: {userRole}</p>}
          {connectedWalletAddress && (
            <p className='text-sm text-green-400 mt-1'>
              Connected wallet: {connectedWalletAddress.slice(0, 6)}...{connectedWalletAddress.slice(-4)}
            </p>
          )}
        </div>

        {error && (
          <div className='mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-sm'>
            {error}
          </div>
        )}

        {!isConnected && (
          <div className='mb-4 p-3 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm'>
            Please connect your wallet to continue registration
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className='space-y-4'>
            {/* Full Name */}
            <div>
              <label htmlFor='fullName' className='block text-sm font-medium text-gray-300 mb-1'>
                Full Name
              </label>
              <input
                type='text'
                id='fullName'
                placeholder='Enter your full name'
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className='w-full px-3 py-2 bg-[#1a0e2e] border border-[#ffffff20] rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500'
                required
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor='email' className='block text-sm font-medium text-gray-300 mb-1'>
                Email Address
              </label>
              <input
                type='email'
                id='email'
                placeholder='example@gmail.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className='w-full px-3 py-2 bg-[#1a0e2e] border border-[#ffffff20] rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500'
                required
              />
            </div>

            {/* Terms and Conditions */}
            <div className='flex items-start space-x-2 mt-4'>
              <input
                type='checkbox'
                id='terms'
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className='mt-1 h-4 w-4 rounded border-gray-500 text-blue-500 focus:ring-blue-500'
              />
              <label htmlFor='terms' className='text-xs text-gray-300'>
                I agree to the{' '}
                <Link href='#' className='text-blue-400 hover:underline'>
                  Terms & Conditions
                </Link>{' '}
                and authorize my information to be securely verified.
              </label>
            </div>

            {/* Register Button */}
            <button
              type='submit'
              disabled={!agreedToTerms || loading}
              className='w-full py-2.5 mt-2 text-white font-medium bg-gradient-to-r from-blue-500 to-purple-500 rounded-md hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#1a0e2e] disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center'
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registering...
                </>
              ) : (
                'Register'
              )}
            </button>
          </div>
        </form>

        {/* Decorative element */}
        <div className='absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-blue-500/40 blur-md'></div>
      </div>
    </div>
  );
}
