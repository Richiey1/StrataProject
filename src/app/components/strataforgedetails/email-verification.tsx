'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';

export default function StratforgeEmailVerification() {
  const router = useRouter();
  const { verifyEmail, resendOtp, error: authError } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [email, setEmail] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    // Get email from localStorage (saved during registration)
    const userEmail = localStorage.getItem('registrationEmail');
    if (!userEmail) {
      // If no email in storage, redirect to registration
      router.push('/user-registration');
    } else {
      setEmail(userEmail);
    }
  }, [router]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setResendDisabled(false);
    }
  }, [countdown]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value[0];
    }
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value !== '' && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (verifyLoading) return; // Prevent multiple submissions

    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter all 6 digits of the OTP');
      return;
    }

    setVerifyLoading(true);
    try {
      const response = await verifyEmail({
        email,
        otp: otpString,
      });
      
      if (response.success && response.data?.token) {
        setTimeout(() => {
          router.push('/');
        }, 100);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      setError(err.response?.data?.message || err.message || 'Verification failed');
      // Clear OTP on error for security
      setOtp(['', '', '', '', '', '']);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      setError('Email not found. Please try registering again.');
      router.push('/user-registration');
      return;
    }

    setResendLoading(true);
    try {
      await resendOtp(email);
      setResendDisabled(true);
      setCountdown(30); // 30 seconds cooldown
      setError(null); // Clear any previous errors
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      setError(err.response?.data?.message || err.message || 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
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
        <div className='text-center mb-8'>
          <h1 className='text-xl font-semibold text-white mb-2'>Verify Your Email</h1>
          <p className='text-sm text-gray-400'>
            We've sent a verification code to<br />
            <span className='text-blue-400'>{email}</span>
          </p>
        </div>

        {(error || authError) && (
          <div className='mb-6 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-sm'>
            {error || authError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* OTP Input */}
          <div>
            <label className='block text-sm font-medium text-gray-300 mb-3 text-center'>
              Enter Verification Code
            </label>
            <div className='flex justify-between gap-2'>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type='text'
                  inputMode='numeric'
                  pattern='[0-9]*'
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className='w-12 h-12 text-center text-lg font-semibold bg-[#1a0e2e] border border-[#ffffff20] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                />
              ))}
            </div>
          </div>

          {/* Verify Button */}
          <button
            type='submit'
            disabled={verifyLoading || otp.join('').length !== 6}
            className='w-full py-3 mt-6 text-white font-medium bg-gradient-to-r from-blue-500 to-purple-500 rounded-md hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#1a0e2e] disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center'
          >
            {verifyLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </>
            ) : (
              'Verify Email'
            )}
          </button>

          {/* Resend OTP */}
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendDisabled || resendLoading}
              className="text-sm text-blue-400 hover:text-blue-300 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
            >
              {resendLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Resending...
                </>
              ) : resendDisabled ? (
                `Resend code in ${countdown}s`
              ) : (
                <span>Didn't receive the code? Resend</span>
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