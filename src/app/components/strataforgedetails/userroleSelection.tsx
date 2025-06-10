'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TokenPlatformRoleSelection() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const router = useRouter();

  // Map UI roles to backend roles
  const roleMapping: Record<string, string> = {
    'Owner': 'owner',
    'User': 'user',
  };

  const handleContinue = () => {
    if (selectedRole) {
      // Map the selected UI role to the backend role
      const backendRole = roleMapping[selectedRole];

      // Store the role in localStorage
      localStorage.setItem('userRole', backendRole);
      console.log(`Selected role: ${backendRole}`);

      // Redirect to registration
      router.push('/user-registration');
    }
  };

  const roles = [
    {
      id: 'Owner',
      title: 'Owner',
      description: 'Create and deploy tokens, set up airdrops, and manage token distribution.',
      features: ['Create custom tokens', 'Deploy to blockchain', 'Setup airdrops', 'Manage distributions'],
      imagePath: '/icons/token-creator.png',
      color: 'text-emerald-400',
      bgGradient: 'from-emerald-500/20 to-green-500/20',
      borderColor: 'border-emerald-500/30',
    },
    {
      id: 'User',
      title: 'User',
      description: 'Discover tokens, participate in airdrops, and trade on the marketplace.',
      features: ['Browse tokens', 'Claim airdrops'],
      imagePath: '/icons/token-trader.png',
      color: 'text-blue-400',
      bgGradient: 'from-blue-500/20 to-cyan-500/20',
      borderColor: 'border-blue-500/30',
    },
  ];

  return (
    <div className='min-h-screen flex items-center justify-center bg-[#1a0e2e] bg-gradient-to-br from-[#1a0e2e] via-[#1a1a2e] to-[#2a1a3e] p-4'>
      <div className='w-full max-w-5xl border border-white/10 rounded-xl p-8 bg-black/40 backdrop-blur-xl shadow-2xl'>
        <div className='text-center mb-12'>
          <h1 className='text-3xl font-bold text-white mb-3'>
            Welcome to <span className='bg-gradient-to-r from-blue-400 to-purple-800 bg-clip-text text-transparent'>StrataForge</span>
          </h1>
          <p className='text-gray-400 text-lg'>Choose your role to get started</p>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10'>
          {roles.map((role) => (
            <div
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`
                relative p-8 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105
                ${
                  selectedRole === role.id
                    ? `bg-gradient-to-br ${role.bgGradient} border-2 ${role.borderColor} shadow-lg shadow-${role.color.split('-')[1]}-500/25`
                    : 'bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10'
                }
              `}
            >
              {/* Selection indicator */}
              {selectedRole === role.id && (
                <div className='absolute top-4 right-4'>
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${role.bgGradient} flex items-center justify-center`}>
                    <svg className='w-4 h-4 text-white' fill='currentColor' viewBox='0 0 20 20'>
                      <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                    </svg>
                  </div>
                </div>
              )}

              <div className='flex flex-col items-center text-center gap-4'>
                {/* Icon placeholder - you can replace with actual icons */}
                <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${role.bgGradient} flex items-center justify-center mb-2`}>
                  <div className={`w-8 h-8 ${role.color}`}>
                    {role.id === 'Owner' ? (
                      <svg fill='currentColor' viewBox='0 0 20 20'>
                        <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z' clipRule='evenodd' />
                      </svg>
                    ) : (
                      <svg fill='currentColor' viewBox='0 0 20 20'>
                        <path d='M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z' />
                        <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm-7-8a7 7 0 1114 0 7 7 0 01-14 0z' clipRule='evenodd' />
                      </svg>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className={`text-xl font-semibold ${role.color} mb-2`}>{role.title}</h3>
                  <p className='text-gray-300 text-sm mb-4 leading-relaxed'>{role.description}</p>
                </div>

                {/* Features list */}
                <div className='w-full'>
                  <h4 className='text-white text-sm font-medium mb-3'>What you can do:</h4>
                  <ul className='space-y-2'>
                    {role.features.map((feature, index) => (
                      <li key={index} className='flex items-center text-gray-400 text-sm'>
                        <div className={`w-1.5 h-1.5 rounded-full ${role.color.replace('text-', 'bg-')} mr-3 flex-shrink-0`}></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className='flex flex-col items-center gap-4'>
          <button
            onClick={handleContinue}
            disabled={!selectedRole}
            className={`
              w-full max-w-md py-3 px-6 text-white font-semibold rounded-lg transition-all duration-300 transform
              ${
                selectedRole
                  ? 'bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 shadow-lg hover:shadow-xl hover:scale-105'
                  : 'bg-gray-600 cursor-not-allowed opacity-50'
              }
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black
            `}
          >
            {selectedRole ? `Continue as ${selectedRole}` : 'Select a Role to Continue'}
          </button>

          <p className='text-sm text-gray-500 text-center max-w-md'>
            Don&apos t worry, you can switch between roles anytime from your dashboard settings.
          </p>
        </div>
      </div>
    </div>
  );
}