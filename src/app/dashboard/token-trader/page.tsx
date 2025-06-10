'use client';
import React, { useState, useEffect } from 'react';
import { useWallet } from '../../../contexts/WalletContext';
import { useReadContract, useReadContracts } from 'wagmi';
import { Abi } from 'viem';
import StrataForgeFactoryABI from '../../../app/components/ABIs/StrataForgeFactoryABI.json';
import StrataForgeMerkleDistributorABI from '../../../app/components/ABIs/StrataForgeMerkleDistributorABI.json';
import TraderDashboardLayout from './TraderDashboardLayout';
import Link from 'next/link';

// SVG Icons for Token Types
const Erc20Icon = () => (
  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="2" />
    <path d="M12 6v12M6 12h12" strokeWidth="2" />
  </svg>
);

const Erc721Icon = () => (
  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="2" />
    <path d="M8 12h8" strokeWidth="2" />
  </svg>
);

const Erc1155Icon = () => (
  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="4" y="4" width="16" height="6" strokeWidth="2" />
    <rect x="4" y="12" width="16" height="6" strokeWidth="2" />
  </svg>
);

const MemeIcon = () => (
  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="2" />
    <path d="M8 8h8M8 16h8" strokeWidth="2" />
  </svg>
);

const StableIcon = () => (
  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M12 4v16M8 8h8M8 16h8" strokeWidth="2" />
    <circle cx="12" cy="12" r="8" strokeWidth="2" />
  </svg>
);

// Token Placeholder Icon
const TokenPlaceholderIcon = () => (
  <svg className="w-16 h-16 text-gray-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
    <path d="M12 6v12M6 12h12" strokeWidth="1.5" />
  </svg>
);

// Airdrop Placeholder Icon
const AirdropPlaceholderIcon = () => (
  <svg className="w-16 h-16 text-gray-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      d="M12 2v6m0 4v10m-6-6h12M4 10l2 2m14-2l-2 2"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const FACTORY_CONTRACT_ADDRESS = '0x59F42c3eEcf829b34d8Ca846Dfc83D3cDC105C3F' as const;
const factoryABI = StrataForgeFactoryABI as Abi;
const distributorABI = StrataForgeMerkleDistributorABI as Abi;

interface Token {
  id: number;
  name: string;
  symbol: string;
  address: string;
  type: string;
  creator?: string;
}

interface Airdrop {
  id: number;
  name: string;
  tokenAddress: string;
  distributorAddress: string;
  status: string;
  tasks?: string[];
  isEligible?: boolean;
}

const TokenTraderDashboard = () => {
  const { address, isConnected, isConnecting, connect, connectError } = useWallet();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [airdrops, setAirdrops] = useState<Airdrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('Token Trader');
  const [expandedTokenId, setExpandedTokenId] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: totalTokens, error: totalTokensError } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: factoryABI,
    functionName: 'getTotalTokenCount',
    query: { enabled: isConnected },
  });

  const { data: totalAirdrops, error: totalAirdropsError } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: factoryABI,
    functionName: 'getAirdropCount',
    query: { enabled: isConnected },
  });

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

  const airdropCalls = React.useMemo(() => {
    if (!totalAirdrops || !isConnected) return [];
    const count = Number(totalAirdrops);
    return Array.from({ length: count }, (_, i) => ({
      address: FACTORY_CONTRACT_ADDRESS,
      abi: factoryABI,
      functionName: 'getAirdropByIndex',
      args: [i],
    }));
  }, [totalAirdrops, isConnected]);

  const { data: tokenData, error: tokenDataError } = useReadContracts({
    contracts: tokenCalls,
    query: { enabled: tokenCalls.length > 0 },
  });

  const { data: airdropData, error: airdropDataError } = useReadContracts({
    contracts: airdropCalls,
    query: { enabled: airdropCalls.length > 0 },
  });

  const claimStatusCalls = React.useMemo(() => {
    if (!isConnected || !address || !airdrops.length) return [];
    return airdrops.map((airdrop) => ({
      address: airdrop.distributorAddress as `0x${string}`,
      abi: distributorABI,
      functionName: 'hasClaimed',
      args: [address],
    }));
  }, [isConnected, address, airdrops]);

  const { data: claimStatusData } = useReadContracts({
    contracts: claimStatusCalls,
    query: { enabled: claimStatusCalls.length > 0 },
  });

  useEffect(() => {
    if (!isConnected || !address || !isMounted) {
      setUserName('Token Trader');
      setLoading(false);
      return;
    }

    setUserName(`${address.slice(0, 6)}...${address.slice(-4)}`);

    if (tokenData && tokenData.length > 0) {
      const allTokens = tokenData
        .map((result, index) => {
          if (result.status === 'success' && result.result) {
            const token = result.result as { name: string; symbol: string; tokenAddress: string; creator: string; tokenType: bigint };
            if (token.name && token.symbol && token.tokenAddress) {
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
                creator: token.creator || undefined,
              } as Token;
            }
            console.warn(`Invalid token data for ID ${index + 1}:`, token);
            return null;
          }
          console.error(`Failed to fetch token ${index + 1}:`, result);
          return null;
        })
        .filter((token): token is Token => token !== null);

      setTokens(allTokens);
    }

    setLoading(false);
  }, [isConnected, address, tokenData, isMounted]);

  useEffect(() => {
    if (!isConnected || !address || !isMounted) return;

    if (airdropData && airdropData.length > 0) {
      const allAirdrops = airdropData
        .map((result, index) => {
          if (result.status === 'success' && result.result) {
            const airdrop = result.result as {
              distributorAddress: string;
              tokenAddress: string;
              creator: string;
              startTime: bigint;
              totalRecipients: bigint;
              dropAmount: bigint;
            };
            const tokenName = tokens.find((t) => t.address === airdrop.tokenAddress)?.name;
            return {
              id: index + 1,
              name: tokenName ? `${tokenName} Airdrop` : `Airdrop ${index + 1}`,
              tokenAddress: airdrop.tokenAddress,
              distributorAddress: airdrop.distributorAddress,
              status: airdrop.startTime <= BigInt(Math.floor(Date.now() / 1000)) ? 'Active' : 'Pending',
              tasks: [],
              isEligible: false,
            } as Airdrop;
          }
          console.error(`Failed to fetch airdrop ${index + 1}:`, result);
          return null;
        })
        .filter((airdrop): airdrop is Airdrop => airdrop !== null);

      if (claimStatusData && claimStatusData.length === allAirdrops.length) {
        const updatedAirdrops = allAirdrops.map((airdrop, index) => ({
          ...airdrop,
          isEligible: claimStatusData[index]?.status === 'success' && claimStatusData[index].result === false,
        }));
        setAirdrops(updatedAirdrops);
      } else {
        setAirdrops(allAirdrops);
      }
    }
  }, [isConnected, address, airdropData, claimStatusData, isMounted, tokens]);

  useEffect(() => {
    if (totalTokensError || tokenDataError || totalAirdropsError || airdropDataError) {
      console.error('Contract read errors:', {
        totalTokensError,
        tokenDataError,
        totalAirdropsError,
        airdropDataError,
      });
      setError('Failed to load tokens or airdrops');
      setLoading(false);
    }
  }, [totalTokensError, tokenDataError, totalAirdropsError, airdropDataError]);

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
      <div className="absolute top-10 right-1/3 w-64 h-64 bg-gradient-to-br from-purple-600/3 to-blue-600/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-gradient-to-tr from-blue-600/3 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 right-10 w-48 h-48 bg-gradient-to-bl from-cyan-500/2 to-transparent rounded-full blur-2xl"></div>
    </div>
  );

  // Updated TokenCard Component
  const TokenCard = React.memo(({ token }: { token: Token }) => {
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

    const isExpanded = expandedTokenId === token.id;
    const [copiedAddress, setCopiedAddress] = useState<string | null>(null); // Added: Track copied address

    const toggleDetails = () => {
      setExpandedTokenId(isExpanded ? null : token.id);
    };

    // Added: Copy address function
    const copyToClipboard = (address: string, type: string) => {
      navigator.clipboard.writeText(address).then(() => {
        setCopiedAddress(type);
        setTimeout(() => setCopiedAddress(null), 2000); // Reset after 2 seconds
      }).catch(() => {
        console.error(`Failed to copy ${type} address`);
      });
    };

    if (!token) {
      return (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-red-500/20">
          <p className="text-red-400">Invalid token data</p>
        </div>
      );
    }

    return (
      <div className="group bg-white/[0.02] backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/[0.04] hover:border-purple-500/30 transition-all duration-300">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
              {icon}
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg leading-tight">{token.name}</h3>
              <p className="text-gray-400 text-sm">{token.symbol}</p>
            </div>
          </div>
          <div className="flex items-center space-x-1 bg-purple-500/10 px-2 py-1 rounded-md">
            <span className="text-purple-300 text-xs font-bold">{label}</span>
          </div>
        </div>
        <div className="mb-2">
          <p className="text-gray-500 text-xs font-medium mb-1">Token Address</p>
          <div className="flex items-center space-x-2 bg-black/20 px-3 py-2 rounded-md">
            <p className="text-gray-300 text-sm font-mono truncate flex-1">{token.address}</p>
            <button
              onClick={() => copyToClipboard(token.address, 'token')}
              className="p-1 rounded hover:bg-purple-500/20 transition-colors"
              title="Copy Token Address"
            >
              {copiedAddress === 'token' ? (
                <span className="text-green-400 text-xs">Copied!</span>
              ) : (
                <svg className="w-4 h-4 text-gray-400 hover:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className={`mb-0 bg-black/20 p-4 rounded-lg transition-all duration-300 overflow-hidden ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 p-0'
        }`}>
          <p className="text-gray-500 text-xs font-medium mb-2">Token Details</p>
          <div className="space-y-2">
            <div>
              <p className="text-gray-400 text-sm">Token ID:</p>
              <p className="text-gray-300 text-sm">{token.id}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Deployer:</p>
              <div className="flex items-center space-x-2">
                <p className="text-gray-300 text-sm font-mono truncate flex-1">{token.creator || 'Unknown'}</p>
                {token.creator && (
                  <button
                    onClick={() => copyToClipboard(token.creator!, 'creator')}
                    className="p-1 rounded hover:bg-purple-500/20 transition-colors"
                    title="Copy Deployer Address"
                  >
                    {copiedAddress === 'creator' ? (
                      <span className="text-green-400 text-xs">Copied!</span>
                    ) : (
                      <svg className="w-4 h-4 text-gray-400 hover:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Token Type:</p>
              <p className="text-gray-300 text-sm">{label}</p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <button
            onClick={toggleDetails}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm font-medium rounded-lg transition-all duration-200"
          >
            {isExpanded ? '▼ Hide Details' : '▶ View Details'}
          </button>
        </div>
      </div>
    );
  });

  TokenCard.displayName = 'TokenCard';

  const AirdropCard = ({ airdrop }: { airdrop: Airdrop }) => (
    <div className="group bg-white/[0.02] backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/[0.04] hover:border-green-500/30 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
            <span className="text-lg">🪂</span>
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg leading-tight">{airdrop.name}</h3>
            <p className="text-gray-400 text-sm">
              {airdrop.tokenAddress.slice(0, 6)}...{airdrop.tokenAddress.slice(-4)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1 bg-green-500/10 px-2 py-1 rounded-md">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-green-300 text-xs font-bold">{airdrop.status}</span>
        </div>
      </div>
      {airdrop.tasks && airdrop.tasks.length > 0 && (
        <div className="mb-6">
          <p className="text-gray-500 text-xs font-medium mb-2">Requirements</p>
          <div className="space-y-1">
            {airdrop.tasks.map((task: string, index: number) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                <span className="text-gray-300">{task}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <Link
        href={`/dashboard/airdrops/claim/${airdrop.id}`}
        className={`w-full px-4 py-2.5 text-white text-sm font-medium rounded-lg transition-all duration-200 text-center block ${
          airdrop.isEligible && airdrop.status === 'Active'
            ? 'bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800'
            : 'bg-gray-600 cursor-not-allowed'
        }`}
        onClick={(e) => {
          if (!airdrop.isEligible || airdrop.status !== 'Active') {
            e.preventDefault();
            alert('You have already claimed this airdrop or it is not active.');
          }
        }}
      >
        {airdrop.isEligible && airdrop.status === 'Active' ? 'Claim Airdrop' : 'Ineligible'}
      </Link>
    </div>
  );

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center min-h-screen bg-[#1A0D23] relative">
      <BackgroundShapes />
      <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin relative z-10"></div>
    </div>
  );

const WalletConnection = () => (
    <div className="min-h-screen bg-[#1A0D23] flex items-center justify-center p-4 relative">
      <BackgroundShapes />
      <div className="bg-[#1E1425]/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-purple-500/20 p-8 text-center relative z-10">
        <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
        <p className="text-gray-300 mb-6">Connect your wallet to access the StrataForge Token Trader dashboard</p>
        {connectError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
            Connection failed: {connectError.message || String(connectError)}
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
    <TraderDashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-[#1A0D23] to-[#2A1F36] p-4 md:p-8 relative">
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
            Discover tokens, claim airdrops, and trade on the StrataForge marketplace
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center space-x-3 relative z-10">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 0010-18 0 9 9 0 0018 0z"
              />
            </svg>
            <p className="text-red-300 font-medium">{error}</p>
          </div>
        )}

        <div className="mb-12 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <h2 className="text-2xl font-bold text-white">Discover Tokens</h2>
            <Link
              href="/dashboard/marketplace"
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all duration-200 font-medium text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5m0 0l-5 5m5-5H6" />
              </svg>
              Visit Marketplace
            </Link>
          </div>
          {tokens.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
              {tokens.map((token) => (
                <TokenCard key={token.id} token={token} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white/[0.02] rounded-xl border border-white/10">
              <div className="mb-4">
                <TokenPlaceholderIcon />
              </div>
              <p className="text-gray-400 text-lg mb-6">No tokens available to discover yet</p>
              <Link
                href="/dashboard/marketplace"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all duration-200 font-medium"
              >
                Visit Marketplace
              </Link>
            </div>
          )}
        </div>

        <div className="mb-12 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <h2 className="text-2xl font-bold text-white">Airdrops</h2>
            <Link
              href="/dashboard/airdrops"
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 font-medium text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5m0 0 l-5 5m5-5H6" />
              </svg>
              View All Airdrops
            </Link>
          </div>
          {airdrops.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {airdrops.map((airdrop) => (
                <AirdropCard key={airdrop.id} airdrop={airdrop} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white/[0.02] rounded-xl border border-white/10">
              <div className="mb-4">
                <AirdropPlaceholderIcon />
              </div>
              <p className="text-gray-400 text-lg mb-6">No airdrops available yet. Check back soon!</p>
              <Link
                href="/dashboard/airdrops"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 font-medium"
              >
                View All Airdrops
              </Link>
            </div>
          )}
        </div>
      </div>
    </TraderDashboardLayout>
  );
};

export default TokenTraderDashboard;