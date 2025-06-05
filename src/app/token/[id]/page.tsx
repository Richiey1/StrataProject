'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link'; // Add this import
import { sampleTokens, Token } from '../../listings/tokenData';

interface ExtendedToken extends Token {
  tgeDetails?: {
    startDate: string;
    endDate: string;
    hardcap: string;
    softcap: string;
    tokenPrice: string;
    vestingPeriod: string;
  };
  socialLinks?: {
    twitter: string;
    discord: string;
    telegram: string;
    website: string;
    github?: string;
  };
}

export default function TokenDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [token, setToken] = useState<ExtendedToken | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const foundToken = sampleTokens.find((t) => t.id === id);
    if (foundToken) {
      const extendedToken: ExtendedToken = {
        ...foundToken,
        tgeDetails: {
          startDate: '2025-05-15',
          endDate: '2025-05-30',
          hardcap: '10,000 ETH',
          softcap: '5,000 ETH',
          tokenPrice: '0.0001 ETH',
          vestingPeriod: '6 months',
        },
        socialLinks: {
          twitter: 'https://twitter.com/' + foundToken.symbol.toLowerCase(),
          discord: 'https://discord.gg/' + foundToken.symbol.toLowerCase(),
          telegram: 'https://t.me/' + foundToken.symbol.toLowerCase(),
          website: 'https://' + foundToken.symbol.toLowerCase() + '.io',
          github:
            foundToken.type === 'ERC-20'
              ? 'https://github.com/' + foundToken.symbol.toLowerCase() + '-protocol'
              : undefined,
        },
      };
      setToken(extendedToken);
    }
    setLoading(false);
  }, [id]);

  if (loading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-gray-900 to-purple-900 text-white flex items-center justify-center'>
        <div className='text-2xl'>Loading...</div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-gray-900 to-purple-900 text-white flex flex-col items-center justify-center gap-4'>
        <div className='text-2xl'>Token not found</div>
        <button
          onClick={() => router.push('/')}
          className='bg-purple-600 hover:bg-purple-700 text-white py-2 px-6 rounded-md transition-colors'
        >
          Back to Tokens
        </button>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-900 to-purple-900 text-white'>
      <main className='container mx-auto px-4 py-8'>
        {/* Back button */}
        <div className='mb-6'>
          <button
            onClick={() => router.push('/')}
            className='flex items-center text-purple-400 hover:text-purple-300 transition-colors'
          >
            <svg
              className='w-5 h-5 mr-2'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                d='M15 19l-7-7 7-7'
              ></path>
            </svg>
            Back to All Tokens
          </button>
        </div>

        {/* Token Hero Section */}
        <div className='relative rounded-xl overflow-hidden mb-8'>
          <div className='h-64 md:h-80 bg-gray-700'>
            <Image
              src={token.backgroundUrl}
              alt={token.name}
              className='w-full h-full object-cover'
            />
          </div>
          <div className='absolute -bottom-12 left-8'>
            <div className='bg-gray-700 p-2 rounded-xl border-4 border-gray-800'>
              <Image
                src={token.logoUrl}
                alt={token.name}
                className='w-20 h-20 rounded-lg bg-white'
              />
            </div>
          </div>
        </div>

        {/* Token Details */}
        <div className='pt-16 pb-8'>
          <div className='flex justify-between items-start mb-6'>
            <div>
              <h1 className='text-3xl font-bold'>{token.name}</h1>
              <p className='text-gray-400 flex items-center gap-2'>
                {token.symbol}
                <span className='w-1 h-1 bg-gray-500 rounded-full'></span>
                {token.type}
              </p>
            </div>
            <span className='bg-purple-600 px-4 py-2 rounded-md font-medium'>{token.price}</span>
          </div>

          <p className='text-gray-300 mb-8 max-w-3xl'>{token.description}</p>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8'>
            {/* Token Information */}
            <div className='bg-gray-800 p-6 rounded-xl'>
              <h2 className='text-xl font-semibold mb-4 border-b border-gray-700 pb-2'>
                Token Information
              </h2>
              <div className='space-y-4'>
                <div className='flex flex-col'>
                  <span className='text-gray-400 text-sm'>Contract Address</span>
                  <span className='font-mono text-purple-400 break-all'>{token.address}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-400'>Network</span>
                  <span>{token.network}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-400'>Supply</span>
                  <span>{token.supply}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-400'>Creator</span>
                  <span>{token.creator}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-400'>Creation Date</span>
                  <span>{token.createdAt}</span>
                </div>
              </div>
            </div>

            {/* ICO/TGE Details */}
            <div className='bg-gray-800 p-6 rounded-xl'>
              <h2 className='text-xl font-semibold mb-4 border-b border-gray-700 pb-2'>
                Token Generation Event
              </h2>
              <div className='space-y-4'>
                {token.tgeDetails ? (
                  <>
                    <div className='flex justify-between'>
                      <span className='text-gray-400'>Start Date</span>
                      <span>{token.tgeDetails.startDate}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-400'>End Date</span>
                      <span>{token.tgeDetails.endDate}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-400'>Hard Cap</span>
                      <span>{token.tgeDetails.hardcap}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-400'>Soft Cap</span>
                      <span>{token.tgeDetails.softcap}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-400'>Token Price</span>
                      <span className='text-purple-400'>{token.tgeDetails.tokenPrice}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-400'>Vesting Period</span>
                      <span>{token.tgeDetails.vestingPeriod}</span>
                    </div>
                  </>
                ) : (
                  <p className='text-gray-400'>No TGE details available for this token.</p>
                )}
              </div>
            </div>

            {/* Features */}
            <div className='bg-gray-800 p-6 rounded-xl'>
              <h2 className='text-xl font-semibold mb-4 border-b border-gray-700 pb-2'>Features</h2>
              <ul className='space-y-3'>
                {token.features.map((feature, index) => (
                  <li key={index} className='flex items-center'>
                    <svg
                      className='w-5 h-5 text-green-500 mr-3 flex-shrink-0'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth='2'
                        d='M5 13l4 4L19 7'
                      ></path>
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Social Links */}
          <div className='bg-gray-800 p-6 rounded-xl mb-8'>
            <h2 className='text-xl font-semibold mb-4 border-b border-gray-700 pb-2'>
              Community & Social
            </h2>
            {token.socialLinks ? (
              <div className='flex flex-wrap gap-4'>
                <a
                  href={token.socialLinks.twitter}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors'
                >
                  <svg
                    className='w-5 h-5 text-blue-400'
                    aria-hidden='true'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path d='M12.186 8.672 18.743.947h-2.927l-5.005 5.9-4.44-5.9H0l7.434 9.876-6.986 8.23h2.927l5.434-6.4 4.82 6.4H20L12.186 8.672Zm-2.267 2.671L8.544 9.515 3.2 2.47h2.2l4.312 5.719 1.375 1.828 5.731 7.613h-2.2l-4.699-6.287Z' />
                  </svg>
                  <span>X (Twitter)</span>
                </a>
                <a
                  href={token.socialLinks.discord}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors'
                >
                  <svg
                    className='w-5 h-5 text-indigo-400'
                    aria-hidden='true'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path d='M14.82 4.26a10.14 10.14 0 0 0-.53 1.1 14.66 14.66 0 0 0-4.58 0 10.14 10.14 0 0 0-.53-1.1 16 16 0 0 0-4.13 1.3 17.33 17.33 0 0 0-3 11.59 16.6 16.6 0 0 0 5.07 2.59A12.89 12.89 0 0 0 8.23 18a9.65 9.65 0 0 1-1.71-.83 3.39 3.39 0 0 0 .42-.33 11.66 11.66 0 0 0 10.12 0q.21.18.42.33a10.84 10.84 0 0 1-1.71.84 12.41 12.41 0 0 0 1.08 1.78 16.44 16.44 0 0 0 5.59-2.59 17.22 17.22 0 0 0-3-11.59 16.09 16.09 0 0 0-4.2-1.35zM8.68 14.81a1.94 1.94 0 0 1-1.8-2 1.93 1.93 0 0 1 1.8-2 1.93 1.93 0 0 1 1.8 2 1.93 1.93 0 0 1-1.8 2zm6.64 0a1.94 1.94 0 0 1-1.8-2 1.93 1.93 0 0 1 1.8-2 1.92 1.92 0 0 1 1.8 2 1.92 1.92 0 0 1-1.8 2z' />
                  </svg>
                  <span>Discord</span>
                </a>
                <a
                  href={token.socialLinks.telegram}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors'
                >
                  <svg
                    className='w-5 h-5 text-blue-300'
                    aria-hidden='true'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path d='M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z' />
                  </svg>
                  <span>Telegram</span>
                </a>
                <a
                  href={token.socialLinks.website}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors'
                >
                  <svg
                    className='w-5 h-5 text-purple-400'
                    aria-hidden='true'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                    strokeWidth='1.5'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418'
                    />
                  </svg>
                  <span>Website</span>
                </a>
                {token.socialLinks.github && (
                  <a
                    href={token.socialLinks.github}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors'
                  >
                    <svg
                      className='w-5 h-5 text-gray-300'
                      aria-hidden='true'
                      xmlns='http://www.w3.org/2000/svg'
                      fill='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path d='M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z' />
                    </svg>
                    <span>GitHub</span>
                  </a>
                )}
              </div>
            ) : (
              <p className='text-gray-400'>No social links available for this token.</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className='flex flex-wrap gap-4 max-w-xl'>
            <button className='flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-md transition-colors font-medium'>
              Manage Token
            </button>
            <Link href={`/dashboard/airdrop/${id}`} className='flex-1'>
              <button className='w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md transition-colors font-medium'>
                Create Airdrop
              </button>
            </Link>
            <button className='flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-md transition-colors font-medium'>
              View on Explorer
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}