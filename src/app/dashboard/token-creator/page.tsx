'use client';
import React, { useState, useEffect } from 'react';
import { useWallet } from '../../../contexts/WalletContext';
import { useReadContract, useReadContracts } from 'wagmi';
import { Abi } from 'viem';
import StrataForgeAdminABI from '../../../app/components/ABIs/StrataForgeAdminABI.json';
import StrataForgeFactoryABI from '../../../app/components/ABIs/StrataForgeFactoryABI.json';
import DashBoardLayout from './DashboardLayout';
import Link from 'next/link';
import ProtectedRoute from '../../../components/auth/ProtectedRoute';

// SVG Icons (unchanged)
const Erc20Icon = () => (
  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="2" />
    <path d="M12 6v12M6 12h12" strokeWidth="2" />
  </svg>
);

const Erc721Icon = () => (
  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="2" />
    <path d="M12 8v8M8 12h8" strokeWidth="2" />
  </svg>
);

const Erc1155Icon = () => (
  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="4" y="4" width="16" height="6" strokeWidth="2" />
    <rect x="4" y="12" width="16" height="6" strokeWidth="2" />
  </svg>
);

const MemeIcon = () => (
  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="2" />
    <path d="M8 8h8M8 16h8" strokeWidth="2" />
  </svg>
);

const StableIcon = () => (
  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M12 4v16M8 8h8M8 16h8" strokeWidth="2" />
    <circle cx="12" cy="12" r="10" strokeWidth="2" />
  </svg>
);

const FreeIcon = () => (
  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="2" />
  </svg>
);

const ClassicIcon = () => (
  <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      strokeWidth="2"
    />
  </svg>
);

const ProIcon = () => (
  <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M4 12l8-8 8 8-8 8-8-8z" strokeWidth="2" />
  </svg>
);

const PremiumIcon = () => (
  <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      d="M12 4c-4.42 0-8 1.79-8 4s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zm-8 8v4h4v-4H4zm8 0v4h4v-4h-4zm8 0v4h4v-4h-4z"
      strokeWidth="2"
    />
  </svg>
);

const TokenPlaceholderIcon = () => (
  <svg className="w-16 h-16 text-purple-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="2" />
    <path d="M12 6v12M6 12h12" strokeWidth="2" />
  </svg>
);

const AirdropPlaceholderIcon = () => (
  <svg className="w-16 h-16 text-green-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      d="M12 2v6m0 4v10m-6-6h12M4 10l2 2m14-2l-2 2"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const FACTORY_CONTRACT_ADDRESS = '0x59F42c3eEcf829b34d8Ca846Dfc83D3cDC105C3F' as const;
const ADMIN_CONTRACT_ADDRESS = '0xADC01DF1dA777a7fE0A93eC58BfC6b69d3354599' as const;
const factoryABI = StrataForgeFactoryABI as Abi;
const adminABI = StrataForgeAdminABI as Abi;

const Dashboard = () => {
  const { address, isConnected, isConnecting, connect, connectError } = useWallet();
  const [tokens, setTokens] = useState<
    { id: number; name: string; symbol: string; address: string; type: string }[]
  >([]);
  const [airdrops, setAirdrops] = useState<
    { id: number; name: string; tokenAddress: string; status: string }[]
  >([]);
  const [subscription, setSubscription] = useState<{
    plan: string;
    tokensRemaining: number;
    expiry: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string[]>([]);
  const [userName, setUserName] = useState('Token Creator');

  // Fetch subscription status
  const { data: subData, error: subError } = useReadContract({
    address: ADMIN_CONTRACT_ADDRESS,
    abi: adminABI,
    functionName: 'getSubscription',
    args: [address],
    query: { enabled: isConnected && !!address, retry: true, retryDelay: 1000 },
  });

  // Fetch total token count
  const { data: totalTokens, error: totalTokensError } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: factoryABI,
    functionName: 'getTotalTokenCount',
    query: { enabled: isConnected, retry: 3, retryDelay: 1000 },
  });

  // Fetch airdrops
  const { data: airdropData, error: airdropError } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: factoryABI,
    functionName: 'getCreatorAirdrops',
    args: [address],
    query: { enabled: isConnected && !!address, retry: 3, retryDelay: 1000 },
  });

  // Create array of token read calls
  const tokenCalls = React.useMemo(() => {
    if (!totalTokens || !isConnected) return [];
    const count = Number(totalTokens);
    return Array.from({ length: count }, (_, i) => ({
      address: FACTORY_CONTRACT_ADDRESS,
      abi: factoryABI,
      functionName: 'getTokenById',
      args: [i + 1],
    }));
  }, [totalTokens, isConnected]);

  // Fetch all tokens
  const { data: tokenData, error: tokenDataError } = useReadContracts({
    contracts: tokenCalls,
    query: { enabled: tokenCalls.length > 0, retry: 3, retryDelay: 1000 },
  });

  // Process subscription, tokens, and airdrops
  useEffect(() => {
    if (!isConnected || !address) {
      setUserName('Token Creator');
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setUserName(`${address.slice(0, 6)}...${address.slice(-4)}`);

      // Process subscription
      if (subData) {
        try {
          const planNames = ['Free', 'Classic', 'Pro', 'Premium'];
          const [tierIndex, expiry, tokensThisMonth] = subData as [bigint, bigint, bigint];
          const planName = planNames[Number(tierIndex)] || 'Free';
          const tokenLimits: { [key: string]: number } = {
            Free: 2,
            Classic: 5,
            Pro: 10,
            Premium: Infinity,
          };
          const maxTokens = tokenLimits[planName];
          const remainingTokens = Math.max(0, maxTokens - Number(tokensThisMonth));

          setSubscription({
            plan: planName,
            tokensRemaining: remainingTokens,
            expiry: Number(expiry) * 1000,
          });
        } catch (subErr) {
          console.warn(`Failed to process subscription for ${address}:`, subErr);
          setSubscription({ plan: 'Free', tokensRemaining: 2, expiry: 0 });
          setError((prev) => [...prev, 'Could not load subscription data']);
        }
      }

      // Process tokens
      if (tokenData && tokenData.length > 0) {
        const userTokens = tokenData
          .map((result, index) => {
            if (result.status === 'success' && result.result) {
              const token = result.result as { name: string; symbol: string; tokenAddress: string; creator: string; tokenType: bigint };
              if (
                token.name &&
                token.symbol &&
                token.tokenAddress &&
                token.creator &&
                token.creator.toLowerCase() === address.toLowerCase()
              ) {
                const typeMap: { [key: number]: string } = {
                  0: 'erc20',
                  1: 'erc721',
                  2: 'erc1155',
                  3: 'meme',
                  4: 'stable',
                };
                const type = typeMap[Number(token.tokenType)] || 'erc20';
                return {
                  id: index + 1,
                  name: token.name,
                  symbol: token.symbol,
                  address: token.tokenAddress,
                  type,
                };
              }
              console.warn(`Invalid token data for ID ${index + 1}:`, token);
              return null;
            }
            console.error(`Failed to fetch token ${index + 1}:`, result);
            return null;
          })
          .filter((token): token is NonNullable<typeof token> => token !== null);

        setTokens(userTokens);
      }

      // Process airdrops
      if (airdropData) {
        try {
          // Type the airdrop data properly
          const airdropResult = airdropData as { 
            status: string; 
            result?: Array<{ tokenAddress: string; startTime: bigint | number }> 
          };
          
          if (airdropResult.status === 'success' && airdropResult.result) {
            const userAirdrops = airdropResult.result.map((airdrop, index) => ({
              id: index + 1,
              name: `Airdrop #${index + 1}`, // Placeholder
              tokenAddress: airdrop.tokenAddress,
              status: Number(airdrop.startTime) * 1000 > Date.now() ? 'Scheduled' : 'Active',
            }));
            setAirdrops(userAirdrops);
          }
        } catch (airdropErr) {
          console.warn('Failed to process airdrop data:', airdropErr);
          setError((prev) => [...prev, 'Could not load airdrop data']);
        }
      }

      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isConnected, address, subData, tokenData, airdropData]);

  // Handle errors
  useEffect(() => {
    const errors: string[] = [];
    if (subError) {
      console.error('Subscription error:', subError);
      errors.push('Failed to load subscription data');
    }
    if (totalTokensError) {
      console.error('Total tokens error:', totalTokensError);
      errors.push('Failed to load token count');
    }
    if (tokenDataError) {
      console.error('Token data error:', tokenDataError);
      errors.push('Failed to load token details');
    }
    if (airdropError) {
      console.error('Airdrop error:', airdropError);
      errors.push('Failed to load airdrop data');
    }
    if (connectError) {
      console.error('Wallet connection error:', connectError);
      errors.push(`Wallet connection failed: ${connectError.message}`);
    }
    setError(errors);
    setLoading(false);
  }, [subError, totalTokensError, tokenDataError, airdropError, connectError]);

  // Handler for airdrop button clicks
  const handleAirdropClick = (e: React.MouseEvent) => {
    if (!isConnected) {
      e.preventDefault();
      alert('Please connect your wallet to access airdrop features.');
      return;
    }
    if (subscription?.plan !== 'Premium') {
      e.preventDefault();
      alert('This feature is only available for Premium subscribers. Please upgrade your plan.');
    }
  };

  // Background Shapes Component (unchanged)
  const BackgroundShapes = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute top-20 left-10 w-32 h-32 border border-purple-500/10 rounded-full"></div>
      <div className="absolute top-40 right-20 w-24 h-24 border border-blue-500/10 rotate-45"></div>
      <div className="absolute bottom-32 left-20 w-40 h-40 border border-purple-400/8 rounded-2xl rotate-12"></div>
      <div className="absolute top-1/3 left-1/4 w-16 h-16 border border-cyan-500/10 rotate-45"></div>
      <div className="absolute bottom-1/4 right-1/3 w-28 h-28 border border-purple-300/8 rounded-full"></div>
      <div className="absolute top-1/4 right-1/4">
        <div className="grid grid-cols-4 gap-3">
          {[...Array(16)].map((_, i) => (
            <div key={i} className="w-1 h-1 bg-purple-500/10 rounded-full"></div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-1/3 left-1/3">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="w-1 h-1 bg-blue-500/10 rounded-full"></div>
          ))}
        </div>
      </div>
      <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 1200 800">
        <path
          d="M200,100 Q400,50 600,100 T1000,100"
          stroke="rgba(147, 51, 234, 0.06)"
          strokeWidth="1"
          fill="none"
        />
        <path
          d="M100,300 Q300,250 500,300 T900,300"
          stroke="rgba(59, 130, 246, 0.06)"
          strokeWidth="1"
          fill="none"
        />
        <path
          d="M300,500 Q500,450 700,500 T1100,500"
          stroke="rgba(147, 51, 234, 0.08)"
          strokeWidth="1"
          fill="none"
        />
      </svg>
      <div className="absolute top-2/3 right-10">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <polygon
            points="40,10 65,25 65,55 40,70 15,55 15,25"
            stroke="rgba(147, 51, 234, 0.08)"
            strokeWidth="1"
            fill="none"
          />
          <polygon
            points="40,20 55,30 55,50 40,60 25,50 25,30"
            stroke="rgba(59, 130, 246, 0.06)"
            strokeWidth="1"
            fill="none"
          />
        </svg>
      </div>
      <div className="absolute top-1/2 left-10">
        <svg width="120" height="80" viewBox="0 0 120 80">
          <circle cx="20" cy="20" r="2" fill="rgba(147, 51, 234, 0.1)" />
          <circle cx="60" cy="15" r="2" fill="rgba(59, 130, 246, 0.1)" />
          <circle cx="100" cy="25" r="2" fill="rgba(147, 51, 234, 0.1)" />
          <circle cx="40" cy="50" r="2" fill="rgba(59, 130, 246, 0.1)" />
          <circle cx="80" cy="55" r="2" fill="rgba(147, 51, 234, 0.1)" />
          <line x1="20" y1="20" x2="60" y2="15" stroke="rgba(147, 51, 234, 0.06)" strokeWidth="1" />
          <line x1="60" y1="15" x2="100" y2="25" stroke="rgba(59, 130, 246, 0.06)" strokeWidth="1" />
          <line x1="20" y1="20" x2="40" y2="50" stroke="rgba(147, 51, 234, 0.06)" strokeWidth="1" />
          <line x1="60" y1="15" x2="80" y2="55" stroke="rgba(59, 130, 246, 0.06)" strokeWidth="1" />
          <line x1="40" y1="50" x2="80" y2="55" stroke="rgba(147, 51, 234, 0.06)" strokeWidth="1" />
        </svg>
      </div>
      <div className="absolute top-10 right-1/3 w-64 h-64 bg-gradient-to-br from-purple-500/3 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-gradient-to-tr from-blue-500/3 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 right-10 w-48 h-48 bg-gradient-to-bl from-cyan-500/2 to-transparent rounded-full blur-2xl"></div>
    </div>
  );

  // Token Card Component (unchanged)
  const TokenCard = ({ token }: { token: { id: number; name: string; symbol: string; address: string; type: string } | null }) => {
    if (!token) {
      return (
        <div className="bg-[#1E1425]/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-red-500/10">
          <p className="text-red-400">Invalid token data</p>
        </div>
      );
    }

    const typeIcons: { [key: string]: React.ReactNode } = {
      erc20: <Erc20Icon />,
      erc721: <Erc721Icon />,
      erc1155: <Erc1155Icon />,
      meme: <MemeIcon />,
      stable: <StableIcon />,
    };
    const typeLabels: { [key: string]: string } = {
      erc20: 'ERC-20',
      erc721: 'ERC-721',
      erc1155: 'ERC-1155',
      meme: 'Meme Coin',
      stable: 'Stable Coin',
    };
    const icon = typeIcons[token.type] || <Erc20Icon />;
    const label = typeLabels[token.type] || 'ERC-20';

    return (
      <div className="bg-[#1E1425]/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-purple-500/10 relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 w-20 h-20 opacity-5">
          <svg viewBox="0 0 40 40" className="w-full h-full">
            <circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="20" cy="20" r="8" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
        </div>
        <div className="flex items-center space-x-3 mb-4">
          <span className="relative z-10">{icon}</span>
          <h3 className="text-lg font-semibold text-white relative z-10">{token.name}</h3>
        </div>
        <p className="text-gray-400 relative z-10">Symbol: {token.symbol}</p>
        <p className="text-gray-400 truncate relative z-10">Address: {token.address}</p>
        <div className="mt-4 flex justify-between items-center relative z-10">
          <span className="text-green-500 font-bold">{label}</span>
          <Link
            href={`/dashboard/token-creator/create-tokens/manage-token/${token.id}`}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-xl hover:opacity-90 transition"
          >
            Manage Token
          </Link>
        </div>
      </div>
    );
  };

  // Airdrop Card Component (unchanged)
  const AirdropCard = ({ airdrop }: { airdrop: { id: number; name: string; tokenAddress: string; status: string } }) => (
    <div className="bg-[#1E1425]/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-green-500/10 relative overflow-hidden group hover:border-green-500/30 transition-all duration-300">
      <div className="absolute top-0 right-0 w-20 h-20 opacity-5">
        <svg viewBox="0 0 40 40" className="w-full h-full">
          <circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth="1" fill="none" />
          <circle cx="20" cy="20" r="8" stroke="currentColor" strokeWidth="1" fill="none" />
        </svg>
      </div>
      <div className="flex items-center space-x-3 mb-4">
        <span className="text-2xl">🪂</span>
        <h3 className="text-lg font-semibold text-white relative z-10">{airdrop.name}</h3>
      </div>
      <p className="text-gray-400 relative z-10">Token: {airdrop.tokenAddress.slice(0, 6)}...{airdrop.tokenAddress.slice(-4)}</p>
      <p className="text-gray-400 relative z-10">Status: {airdrop.status}</p>
      <Link
        href={`/dashboard/airdrop/${airdrop.id}`}
        className="mt-4 inline-flex px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:opacity-90 transition relative z-10"
      >
        View Details
      </Link>
    </div>
  );

  // Subscription Card Component (updated)
  const SubscriptionCard = () => {
    const getPlanIcon = (plan: string) => {
      const icons: { [key: string]: React.ReactNode } = {
        Free: <FreeIcon />,
        Classic: <ClassicIcon />,
        Pro: <ProIcon />,
        Premium: <PremiumIcon />,
      };
      return icons[plan] || <FreeIcon />;
    };

    const maxTokens: { [key: string]: number } = {
      Free: 2,
      Classic: 5,
      Pro: 10,
      Premium: Infinity,
    };

    return (
      <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-purple-500/20 relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
        <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
          <svg viewBox="0 0 40 40" className="w-full h-full">
            <circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="20" cy="20" r="8" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
        </div>
        {subscription ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-gray-300 text-sm">Plan</p>
                <div className="flex items-center space-x-2">
                  {getPlanIcon(subscription.plan)}
                  <p className="text-white font-medium">{subscription.plan}</p>
                </div>
              </div>
              <div>
                <p className="text-gray-300 text-sm">Tokens Remaining</p>
                <p className="text-white font-medium">
                  {subscription.plan === 'Premium'
                    ? 'Unlimited'
                    : `${subscription.tokensRemaining} / ${maxTokens[subscription.plan] || 2}`}
                </p>
                {subscription.plan !== 'Premium' && (
                  <div className="w-full bg-gray-700/50 rounded-full h-2.5 mt-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-blue-600 h-2.5 rounded-full"
                      style={{
                        width: `${Math.min(100, (subscription.tokensRemaining / (maxTokens[subscription.plan] || 2)) * 100)}%`,
                      }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
            <div className="mb-4">
              <p className="text-gray-300 text-sm">Expiry</p>
              <p className="text-white font-medium">
                {subscription.expiry && subscription.expiry > 0
                  ? new Date(subscription.expiry).toLocaleDateString()
                  : subscription.plan === 'Free'
                  ? 'No Expiry'
                  : 'N/A'}
              </p>
            </div>
            <Link
              href="/dashboard/token-creator/manage-subscription"
              className="inline-flex px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 relative z-10"
            >
              {subscription.plan === 'Free' ? 'Upgrade Plan' : 'Manage Subscription'}
            </Link>
          </>
        ) : (
          <p className="text-gray-400 relative z-10">Loading subscription data...</p>
        )}
      </div>
    );
  };

  // Loading Component (unchanged)
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center min-h-screen bg-[#1A0D23] relative">
      <BackgroundShapes />
      <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin relative z-10"></div>
    </div>
  );

  // Wallet Connection Component (unchanged)
  const WalletConnection = () => (
    <div className="min-h-screen bg-[#1A0D23] flex items-center justify-center p-4 relative">
      <BackgroundShapes />
      <div className="bg-[#1E1425]/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-purple-500/20 p-8 text-center relative z-10">
        <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
        <p className="text-gray-300 mb-6">Connect your wallet to access the StrataForge dashboard</p>
        {connectError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
            {connectError.message.includes('storage')
              ? 'Storage access is restricted. Please disable incognito mode or allow storage access.'
              : `Connection failed: ${connectError.message}`}
          </div>
        )}
        <button
          onClick={connect}
          disabled={isConnecting}
          className={`px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-xl hover:opacity-90 transition ${
            isConnecting ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      </div>
    </div>
  );

  if (!isConnected) {
    return <WalletConnection />;
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <DashBoardLayout>
      <div className="min-h-screen bg-[#1A0D23] p-4 md:p-8 relative">
        <BackgroundShapes />
        <div
          className="welcome-section text-center mb-8 rounded-lg p-6 relative z-10"
          style={{
            background:
              'radial-gradient(50% 206.8% at 50% 50%, rgba(10, 88, 116, 0.7) 0%, rgba(32, 23, 38, 0.7) 56.91%)',
          }}
        >
          <h1 className="font-poppins font-semibold text-3xl md:text-4xl leading-[170%] mb-2">
            Welcome back, {userName} <span className="text-yellow-400">👋</span>
          </h1>
          <p className="font-vietnam font-normal text-base leading-[170%] tracking-[1%] text-[hsl(var(--foreground)/0.7)]">
            Create and manage your tokens and airdrops with StrataForge – secure and seamless!
          </p>
        </div>
        {error.length > 0 && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center space-x-3 relative z-10">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-500 font-medium">{error.join(', ')}</p>
          </div>
        )}
        <div className="mb-10 relative z-10">
          <h2 className="font-poppins font-semibold text-xl md:text-2xl mb-6">Your Subscription</h2>
          <SubscriptionCard />
        </div>
        <div className="mb-10 relative z-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-poppins font-semibold text-xl md:text-2xl">Your Tokens</h2>
            <Link
              href="/dashboard/token-creator/create-tokens"
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-xl hover:opacity-90 transition"
            >
              Create New Token
            </Link>
          </div>
          {tokens.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {tokens.map((token) => (
                <TokenCard key={token.id} token={token} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-[#1E1425]/40 rounded-2xl border border-purple-500/20">
              <div className="mb-4">
                <TokenPlaceholderIcon />
              </div>
              <p className="text-gray-400 text-lg mb-4">You haven’t created any tokens yet.</p>
              <Link
                href="/dashboard/token-creator/create-token"
                className="inline-flex px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-xl hover:opacity-90 transition"
              >
                Create Your First Token
              </Link>
            </div>
          )}
        </div>
        <div className="mb-10 relative z-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-poppins font-semibold text-xl md:text-2xl">Your Airdrops</h2>
            <Link
              href="/dashboard/token-creator/airdrop-listing"
              className={`px-4 py-2 rounded-xl text-white transition ${
                subscription?.plan === 'Premium'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90'
                  : 'bg-gray-600 cursor-not-allowed'
              }`}
              onClick={handleAirdropClick}
            >
              Create Airdrop
            </Link>
          </div>
          {airdrops.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {airdrops.map((airdrop) => (
                <AirdropCard key={airdrop.id} airdrop={airdrop} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-[#1E1425]/40 rounded-2xl border border-green-500/20">
              <div className="mb-4">
                <AirdropPlaceholderIcon />
              </div>
              <p className="text-gray-400 text-lg mb-4">No airdrops created yet. Start an airdrop to distribute your tokens!</p>
              <Link
                href="/dashboard/token-creator/airdrop-listing"
                className={`inline-flex px-6 py-3 rounded-xl text-white transition ${
                  subscription?.plan === 'Premium'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90'
                    : 'bg-gray-600 cursor-not-allowed'
                }`}
                onClick={handleAirdropClick}
              >
                Create Your First Airdrop
              </Link>
            </div>
          )}
        </div>
      </div>
    </DashBoardLayout>
  );
};

export default Dashboard;