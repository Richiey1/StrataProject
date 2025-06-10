'use client';
import React, { useState, useEffect, ChangeEvent } from 'react';
import { useWallet } from '../../../../contexts/WalletContext';
import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Abi, isAddress } from 'viem';
import StrataForgeAdminABI from '../../../../app/components/ABIs/StrataForgeAdminABI.json';
import StrataForgeFactoryABI from '../../../../app/components/ABIs/StrataForgeFactoryABI.json';
import AdminDashboardLayout from '../AdminDashboardLayout';

const ADMIN_CONTRACT_ADDRESS = '0xADC01DF1dA777a7fE0A93eC58BfC6b69d3354599' as const;
const FACTORY_CONTRACT_ADDRESS = '0x59F42c3eEcf829b34d8Ca846Dfc83D3cDC105C3F' as const;
const adminABI = StrataForgeAdminABI as Abi;
const factoryABI = StrataForgeFactoryABI as Abi;
const EXPLORER_URL = 'https://sepolia.basescan.org/address';

// Define proper types for token data
interface TokenInfo {
  tokenAddress: string;
  name: string;
  symbol: string;
  initialSupply: string;
  timestamp: number;
  tokenType: number;
  creator: string;
}

type TokenDataArray = [string, string, string, bigint, bigint, bigint, string];

interface TokenDataObject {
  tokenAddress: string;
  name: string;
  symbol: string;
  initialSupply: bigint | string | number;
  timestamp: bigint | string | number;
  tokenType: bigint | string | number;
  creator: string;
}

const ContractControls = () => {
  const { address, isConnected } = useWallet();
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [newFactoryAddress, setNewFactoryAddress] = useState('');
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [creatorAddress, setCreatorAddress] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [tokenDetails, setTokenDetails] = useState<TokenInfo | null>(null);
  const [creatorTokenCount, setCreatorTokenCount] = useState<bigint | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [isTxPending, setIsTxPending] = useState(false);

  const { writeContract, error: writeError, isPending: isWritePending } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const {
    data: adminCount,
    error: adminCountError,
    isLoading: adminCountLoading,
    isSuccess: adminCountSuccess,
  } = useReadContract({
    address: ADMIN_CONTRACT_ADDRESS,
    abi: adminABI,
    functionName: 'adminCount',
    query: { enabled: isConnected, retry: 3, retryDelay: 1000 },
  });

  const {
    data: contractState,
    error: contractStateError,
    isLoading: contractStateLoading,
  } = useReadContracts({
    contracts: [
      {
        address: ADMIN_CONTRACT_ADDRESS,
        abi: adminABI,
        functionName: 'factoryContract',
      },
      {
        address: ADMIN_CONTRACT_ADDRESS,
        abi: adminABI,
        functionName: 'paused',
      },
    ],
    query: { enabled: isConnected, retry: 3, retryDelay: 1000 },
  });

  const {
    data: factoryState,
    error: factoryStateError,
    isLoading: factoryStateLoading,
  } = useReadContracts({
    contracts: [
      {
        address: contractState?.[0]?.result as `0x${string}` | undefined,
        abi: factoryABI,
        functionName: 'getTotalTokenCount',
      },
      {
        address: contractState?.[0]?.result as `0x${string}` | undefined,
        abi: factoryABI,
        functionName: 'getAirdropCount',
      },
      {
        address: contractState?.[0]?.result as `0x${string}` | undefined,
        abi: factoryABI,
        functionName: 'paused',
      },
    ],
    query: { enabled: isConnected && !!contractState?.[0]?.result, retry: 3, retryDelay: 1000 },
  });

  const {
    data: tokenData,
    error: tokenError,
    isLoading: tokenLoading,
    refetch: refetchToken,
  } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: factoryABI,
    functionName: 'getTokenById',
    args: [tokenId ? BigInt(tokenId) : BigInt(0)],
    query: { enabled: isConnected && !!tokenId && Number(tokenId) > 0, retry: 3, retryDelay: 1000 },
  });

  const {
    data: creatorTokenCountData,
    error: creatorTokenCountError,
    isLoading: creatorTokenCountLoading,
    refetch: refetchCreatorTokenCount,
  } = useReadContract({
    address: contractState?.[0]?.result as `0x${string}` | undefined,
    abi: factoryABI,
    functionName: 'getTokenCount',
    args: [creatorAddress],
    query: { enabled: isConnected && isAddress(creatorAddress) && !!contractState?.[0]?.result, retry: 3, retryDelay: 1000 },
  });

  const adminChecks = React.useMemo(() => {
    if (!adminCount || !isConnected || !adminCountSuccess) return [];
    const count = Number(adminCount);
    return Array.from({ length: count }, (_, i) => ({
      address: ADMIN_CONTRACT_ADDRESS as `0x${string}`,
      abi: adminABI,
      functionName: 'admin' as const,
      args: [i] as const,
    }));
  }, [adminCount, isConnected, adminCountSuccess]);

  const {
    data: adminAddresses,
    error: adminAddressesError,
    isLoading: adminAddressesLoading,
    isSuccess: adminAddressesSuccess,
  } = useReadContracts({
    contracts: adminChecks,
    query: { enabled: adminChecks.length > 0, retry: 3, retryDelay: 1000 },
  });

  useEffect(() => {
    if (!address || !adminAddressesSuccess || !adminAddresses || adminAddresses.length === 0) {
      if (!adminCountLoading && !adminAddressesLoading && adminCountSuccess) {
        setLoading(false);
      }
      return;
    }

    let isAdminUser = false;
    for (let i = 0; i < adminAddresses.length; i++) {
      const result = adminAddresses[i];
      if (result?.status === 'success' && result.result) {
        const adminAddress = result.result as string;
        if (adminAddress && adminAddress.toLowerCase() === address?.toLowerCase()) {
          isAdminUser = true;
          break;
        }
      }
    }

    setIsAdmin(isAdminUser);
    setLoading(false);
  }, [address, adminAddresses, adminAddressesSuccess, adminCountLoading, adminAddressesLoading, adminCountSuccess]);

  useEffect(() => {
    console.log('tokenData:', tokenData, 'tokenError:', tokenError);
    if (tokenError) {
      setTokenDetails(null);
      setError(tokenError.message.includes('InvalidTokenId') ? 'Invalid token ID' : 'Failed to load token details');
      return;
    }

    if (tokenData) {
      try {
        let tokenInfo: TokenInfo;

        if (Array.isArray(tokenData)) {
          const [tokenAddress, name, symbol, initialSupply, timestamp, tokenType, creator] = tokenData as TokenDataArray;
          tokenInfo = {
            tokenAddress,
            name,
            symbol,
            initialSupply: initialSupply.toString(),
            timestamp: Number(timestamp) * 1000,
            tokenType: Number(tokenType),
            creator,
          };
        } else if (typeof tokenData === 'object' && tokenData !== null) {
          const tokenObj = tokenData as TokenDataObject;
          tokenInfo = {
            tokenAddress: tokenObj.tokenAddress,
            name: tokenObj.name,
            symbol: tokenObj.symbol,
            initialSupply: BigInt(tokenObj.initialSupply || 0).toString(),
            timestamp: Number(tokenObj.timestamp || 0) * 1000,
            tokenType: Number(tokenObj.tokenType || 0),
            creator: tokenObj.creator,
          };
        } else {
          throw new Error('Invalid tokenData format');
        }

        setTokenDetails(tokenInfo);
      } catch (err) {
        console.error('Error processing tokenData:', err);
        setTokenDetails(null);
        setError('Failed to parse token details');
      }
    }
  }, [tokenData, tokenError]);

  useEffect(() => {
    if (creatorTokenCountData && !creatorTokenCountError) {
      setCreatorTokenCount(creatorTokenCountData as bigint);
    }
  }, [creatorTokenCountData, creatorTokenCountError]);

  useEffect(() => {
    const errors: string[] = [];
    if (adminCountError) errors.push('Failed to load admin count');
    if (adminAddressesError) errors.push('Failed to load admin addresses');
    if (contractStateError) errors.push('Failed to load admin contract state');
    if (factoryStateError) errors.push('Failed to load factory contract state');
    if (tokenError) errors.push('Failed to load token details');
    if (creatorTokenCountError) errors.push('Failed to load creator token count');
    if (writeError) {
      const errorMessage = writeError.message.includes('NotAdmin') ? 'Only admins can perform this action' :
        writeError.message.includes('InvalidAddress') ? 'Invalid address provided' :
        writeError.message.includes('AlreadyPaused') ? 'Contract is already paused' :
        writeError.message.includes('NotPaused') ? 'Contract is not paused' :
        writeError.message.includes('InvalidTokenId') ? 'Invalid token ID' :
        'Transaction failed';
      errors.push(errorMessage);
    }

    setError(errors.join(', '));
    if (!adminCountLoading && !adminAddressesLoading && !contractStateLoading && !factoryStateLoading && !tokenLoading && !creatorTokenCountLoading && !isTxConfirming) {
      setLoading(false);
      setIsTxPending(false);
    }
  }, [adminCountError, adminAddressesError, contractStateError, factoryStateError, tokenError, creatorTokenCountError, writeError, adminCountLoading, adminAddressesLoading, contractStateLoading, factoryStateLoading, tokenLoading, creatorTokenCountLoading, isTxConfirming]);

  useEffect(() => {
    if (isTxSuccess && txHash) {
      setNewFactoryAddress('');
      setNewAdminAddress('');
      setTxHash(undefined);
      setIsTxPending(false);
    }
  }, [isTxSuccess, txHash]);

  const handleSetFactory = () => {
    if (!isAddress(newFactoryAddress)) {
      setError('Please enter a valid Ethereum address for factory');
      return;
    }
    setIsTxPending(true);
    writeContract({
      address: ADMIN_CONTRACT_ADDRESS,
      abi: adminABI,
      functionName: 'setFactoryContract',
      args: [newFactoryAddress],
    }, {
      onSuccess: (hash) => setTxHash(hash),
      onError: () => setIsTxPending(false),
    });
  };

  const handleUpdateAdminContract = () => {
    if (!isAddress(newAdminAddress)) {
      setError('Please enter a valid Ethereum address for admin contract');
      return;
    }
    setIsTxPending(true);
    writeContract({
      address: contractState?.[0]?.result as `0x${string}`,
      abi: factoryABI,
      functionName: 'updateAdminContract',
      args: [newAdminAddress],
    }, {
      onSuccess: (hash) => setTxHash(hash),
      onError: () => setIsTxPending(false),
    });
  };

  const handleAdminPause = () => {
    setIsTxPending(true);
    writeContract({
      address: ADMIN_CONTRACT_ADDRESS,
      abi: adminABI,
      functionName: 'pause',
    }, {
      onSuccess: (hash) => setTxHash(hash),
      onError: () => setIsTxPending(false),
    });
  };

  const handleAdminUnpause = () => {
    setIsTxPending(true);
    writeContract({
      address: ADMIN_CONTRACT_ADDRESS,
      abi: adminABI,
      functionName: 'unpause',
    }, {
      onSuccess: (hash) => setTxHash(hash),
      onError: () => setIsTxPending(false),
    });
  };

  const handleFactoryPause = () => {
    setIsTxPending(true);
    writeContract({
      address: contractState?.[0]?.result as `0x${string}`,
      abi: factoryABI,
      functionName: 'pause',
    }, {
      onSuccess: (hash) => setTxHash(hash),
      onError: () => setIsTxPending(false),
    });
  };

  const handleFactoryUnpause = () => {
    setIsTxPending(true);
    writeContract({
      address: contractState?.[0]?.result as `0x${string}`,
      abi: factoryABI,
      functionName: 'unpause',
    }, {
      onSuccess: (hash) => setTxHash(hash),
      onError: () => setIsTxPending(false),
    });
  };

  const handleQueryToken = () => {
    if (!tokenId || Number(tokenId) <= 0) {
      setError('Please enter a valid token ID (greater than 0)');
      return;
    }
    setTokenDetails(null);
    refetchToken();
  };

  const handleQueryCreatorTokenCount = () => {
    if (!isAddress(creatorAddress)) {
      setError('Please enter a valid creator address');
      return;
    }
    refetchCreatorTokenCount();
  };

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center min-h-screen bg-[#1A0D23] relative">
      <div className="text-center relative z-10">
        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white text-lg">Loading contract controls...</p>
        {error && <p className="text-red-400 text-sm mt-2 max-w-md">{error}</p>}
      </div>
    </div>
  );

  const WalletConnection = () => (
    <div className="min-h-screen bg-[#1A0D23] flex items-center justify-center p-4 relative">
      <div className="bg-[#1E1425]/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-purple-500/20 p-8 text-center relative z-10">
        <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
        <p className="text-gray-300 mb-6">Connect your wallet to manage contract controls</p>
        <button
          onClick={() => document.querySelector('appkit-button')?.click()}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-xl hover:opacity-90 transition"
        >
          Connect Wallet
        </button>
      </div>
    </div>
  );

  const UnauthorizedAccess = () => (
    <div className="min-h-screen bg-[#1A0D23] relative overflow-hidden flex items-center justify-center p-4">
      <div className="max-w-lg w-full relative z-10">
        <div className="bg-[#1E1425]/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-red-500/20 p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-300 mb-6">You are not authorized to manage contract controls</p>
          </div>
          <div className="bg-[#16091D]/60 backdrop-blur-sm rounded-xl p-4 mb-6 text-left space-y-2 border border-gray-700/30">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Connected Address:</span>
              <span className="font-mono text-gray-300 text-xs">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Admin Count:</span>
              <span className="font-mono text-gray-300">{adminCount ? Number(adminCount).toString() : '0'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Network:</span>
              <span className="font-mono text-gray-300">Base Sepolia</span>
            </div>
            {error && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-red-400 text-xs">Error</span>
                </div>
                <div className="text-xs text-red-400 mt-2 p-2 bg-red-500/10 rounded">{error}</div>
              </>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );

  if (!isConnected) return <WalletConnection />;
  if (loading) return <LoadingSpinner />;
  if (!isAdmin) return <UnauthorizedAccess />;

  const adminPaused = contractState?.[1]?.result as boolean;
  const factoryPaused = factoryState?.[2]?.result as boolean;
  const factoryAddress = contractState?.[0]?.result as string | undefined;
  
  return (
    <AdminDashboardLayout>
      <div className="min-h-screen bg-[#1A0D23] p-4 md:p-8 relative">
        <div
          className="welcome-section text-center mb-8 rounded-lg p-6 relative z-10"
          style={{
            background:
              'radial-gradient(50% 206.8% at 50% 50%, rgba(10, 88, 116, 0.7) 0%, rgba(32, 23, 38, 0.7) 56.91%)',
          }}
        >
          <h1 className="font-poppins font-semibold text-3xl md:text-4xl leading-[170%] mb-2">
            Contract Controls <span className="text-purple-400">🛠️</span>
          </h1>
          <p className="font-vietnam font-normal text-base leading-[170%] tracking-[1%] text-[hsl(var(--foreground)/0.7)]">
            Manage admin and factory contract settings, pause states, and token tracking.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center space-x-3 relative z-10">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-300 font-medium">{error}</p>
          </div>
        )}

        <div className="mb-10 relative z-10">
          <h2 className="font-poppins font-semibold text-xl md:text-2xl mb-6">Contract Status</h2>
          <div className="bg-[#1E1425]/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-purple-500/10 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#16091D]/60 rounded-xl">
              <h3 className="text-lg font-semibold text-white">Factory Contract</h3>
              <a
                href={`${EXPLORER_URL}/${factoryAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 font-mono text-sm hover:underline break-all"
              >
                {factoryAddress
                  ? `${factoryAddress.slice(0, 6)}...${factoryAddress.slice(-4)}`
                  : 'Not set'}
              </a>
            </div>
            <div className="p-4 bg-[#16091D]/60 rounded-xl">
              <h3 className="text-lg font-semibold text-white">Total Token Count</h3>
              <p className="text-2xl font-bold text-purple-400">{factoryState?.[0]?.result?.toString() || '0'}</p>
            </div>
            <div className="p-4 bg-[#16091D]/60 rounded-xl">
              <h3 className="text-lg font-semibold text-white">Airdrop Count</h3>
              <p className="text-2xl font-bold text-purple-400">{factoryState?.[1]?.result?.toString() || '0'}</p>
            </div>
          </div>
        </div>

        <div className="mb-10 relative z-10">
          <h2 className="font-poppins font-semibold text-xl md:text-2xl mb-6">Set Factory Contract (Admin)</h2>
          <div className="bg-[#1E1425]/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-purple-500/10">
            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
              <input
                type="text"
                placeholder="Enter factory contract address (0x...)"
                value={newFactoryAddress}
                onChange={(e) => setNewFactoryAddress(e.target.value)}
                className="w-full md:flex-1 bg-[#16091D]/60 border border-gray-700/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
              />
              <button
                onClick={handleSetFactory}
                disabled={isWritePending || isTxPending || isTxConfirming}
                className={`w-full md:w-auto px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ${
                  (isWritePending || isTxPending || isTxConfirming) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isWritePending || isTxPending || isTxConfirming ? 'Processing...' : 'Set Factory'}
              </button>
            </div>
            {isTxPending && <p className="text-yellow-400 text-sm mt-2">Transaction pending: {txHash}</p>}
            {isTxSuccess && <p className="text-green-400 text-sm mt-2">Factory updated successfully!</p>}
          </div>
        </div>

        <div className="mb-10 relative z-10">
          <h2 className="font-poppins font-semibold text-xl md:text-2xl mb-6">Update Admin Contract (Factory)</h2>
          <div className="bg-[#1E1425]/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-purple-500/10">
            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
              <input
                type="text"
                placeholder="Enter admin contract address (0x...)"
                value={newAdminAddress}
                onChange={(e) => setNewAdminAddress(e.target.value)}
                className="w-full md:flex-1 bg-[#16091D]/60 border border-gray-700/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
              />
              <button
                onClick={handleUpdateAdminContract}
                disabled={isWritePending || isTxPending || isTxConfirming || !factoryAddress}
                className={`w-full md:w-auto px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ${
                  (isWritePending || isTxPending || isTxConfirming || !factoryAddress) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isWritePending || isTxPending || isTxConfirming ? 'Processing...' : 'Update Admin Contract'}
              </button>
            </div>
            {isTxPending && <p className="text-yellow-400 text-sm mt-2">Transaction pending: {txHash}</p>}
            {isTxSuccess && <p className="text-green-400 text-sm mt-2">Admin contract updated successfully!</p>}
          </div>
        </div>

        <div className="mb-10 relative z-10">
          <h2 className="font-poppins font-semibold text-xl md:text-2xl mb-6">Contract Pause Controls</h2>
          <div className="bg-[#1E1425]/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-purple-500/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Admin Contract</h3>
                <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                  <button
                    onClick={handleAdminPause}
                    disabled={isWritePending || isTxPending || isTxConfirming || adminPaused}
                    className={`w-full md:w-auto px-6 py-3 bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ${
                      (isWritePending || isTxPending || isTxConfirming || adminPaused) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isWritePending || isTxPending || isTxConfirming ? 'Processing...' : 'Pause Admin'}
                  </button>
                  <button
                    onClick={handleAdminUnpause}
                    disabled={isWritePending || isTxPending || isTxConfirming || !adminPaused}
                    className={`w-full md:w-auto px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ${
                      (isWritePending || isTxPending || isTxConfirming || !adminPaused) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isWritePending || isTxPending || isTxConfirming ? 'Processing...' : 'Unpause Admin'}
                  </button>
                </div>
                <p className={`text-sm mt-2 ${adminPaused ? 'text-red-400' : 'text-green-400'}`}>
                  Status: {adminPaused ? 'Paused' : 'Active'}
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Factory Contract</h3>
                <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                  <button
                    onClick={handleFactoryPause}
                    disabled={isWritePending || isTxPending || isTxConfirming || factoryPaused || !factoryAddress}
                    className={`w-full md:w-auto px-6 py-3 bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ${
                      (isWritePending || isTxPending || isTxConfirming || factoryPaused || !factoryAddress) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isWritePending || isTxPending || isTxConfirming ? 'Processing...' : 'Pause Factory'}
                  </button>
                  <button
                    onClick={handleFactoryUnpause}
                    disabled={isWritePending || isTxPending || isTxConfirming || !factoryPaused || !factoryAddress}
                    className={`w-full md:w-auto px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ${
                      (isWritePending || isTxPending || isTxConfirming || !factoryPaused || !factoryAddress) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isWritePending || isTxPending || isTxConfirming ? 'Processing...' : 'Unpause Factory'}
                  </button>
                </div>
                <p className={`text-sm mt-2 ${factoryPaused ? 'text-red-400' : 'text-green-400'}`}>
                  Status: {factoryPaused ? 'Paused' : 'Active'}
                </p>
              </div>
            </div>
            {isTxPending && <p className="text-yellow-400 text-sm mt-2">Transaction pending: {txHash}</p>}
            {isTxSuccess && <p className="text-green-400 text-sm mt-2">Contract state updated successfully!</p>}
          </div>
        </div>

        <div className="mb-10 relative z-10">
          <h2 className="font-poppins font-semibold text-xl md:text-2xl mb-6">Token Management</h2>
          <div className="bg-[#1E1425]/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-purple-500/10">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Query Token by ID</h3>
              <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
                <input
                  type="number"
                  placeholder="Enter token ID"
                  value={tokenId}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setTokenId(e.target.value)}
                  className="w-full md:flex-1 bg-[#16091D]/60 border border-gray-700/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                />
                <button
                  onClick={handleQueryToken}
                  disabled={tokenLoading || isWritePending || isTxPending || isTxConfirming}
                  className={`w-full md:w-auto px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ${
                    (tokenLoading || isWritePending || isTxPending || isTxConfirming) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {tokenLoading ? 'Loading...' : 'Query Token'}
                </button>
              </div>
              {tokenDetails && (
                <div className="mt-4 p-4 bg-[#16091D]/60 rounded-xl">
                  <h4 className="text-md font-semibold text-white mb-2">Token Details</h4>
                  <p className="text-gray-300">
                    <span className="font-medium">Token Address:</span>{' '}
                    <a
                      href={`${EXPLORER_URL}/${tokenDetails.tokenAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      {tokenDetails.tokenAddress.slice(0, 6)}...{tokenDetails.tokenAddress.slice(-4)}
                    </a>
                  </p>
                  <p className="text-gray-300">
                    <span className="font-medium">Name:</span> {tokenDetails.name}
                  </p>
                  <p className="text-gray-300">
                    <span className="font-medium">Symbol:</span> {tokenDetails.symbol}
                  </p>
                  <p className="text-gray-300">
                    <span className="font-medium">Initial Supply:</span> {tokenDetails.initialSupply}
                  </p>
                  <p className="text-gray-300">
                    <span className="font-medium">Created At:</span>{' '}
                    {new Date(tokenDetails.timestamp).toLocaleString()}
                  </p>
                  <p className="text-gray-300">
                    <span className="font-medium">Token Type:</span>{' '}
                    {['Unknown', 'ERC20', 'ERC721', 'ERC1155', 'Memecoin', 'Stablecoin'][tokenDetails.tokenType] || 'Unknown'}
                  </p>
                  <p className="text-gray-300">
                    <span className="font-medium">Creator:</span>{' '}
                    <a
                      href={`${EXPLORER_URL}/${tokenDetails.creator}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      {tokenDetails.creator.slice(0, 6)}...{tokenDetails.creator.slice(-4)}
                    </a>
                  </p>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Query Creator Token Count</h3>
              <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
                <input
                  type="text"
                  placeholder="Enter creator address (0x...)"
                  value={creatorAddress}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setCreatorAddress(e.target.value)}
                  className="w-full md:flex-1 bg-[#16091D]/60 border border-gray-700/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                />
                <button
                  onClick={handleQueryCreatorTokenCount}
                  disabled={creatorTokenCountLoading || isWritePending || isTxPending || isTxConfirming || !factoryAddress}
                  className={`w-full md:w-auto px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ${
                    (creatorTokenCountLoading || isWritePending || isTxPending || isTxConfirming || !factoryAddress) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {creatorTokenCountLoading ? 'Loading...' : 'Query Token Count'}
                </button>
              </div>
              {creatorTokenCount !== null && (
                <div className="mt-4 p-4 bg-[#16091D]/60 rounded-xl">
                  <h4 className="text-md font-semibold text-white mb-2">Creator Token Count</h4>
                  <p className="text-gray-300">
                    <span className="font-medium">Creator:</span>{' '}
                    <a
                      href={`${EXPLORER_URL}/${creatorAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      {creatorAddress.slice(0, 6)}...{creatorAddress.slice(-4)}
                    </a>
                  </p>
                  <p className="text-gray-300">
                    <span className="font-medium">Token Count:</span> {creatorTokenCount.toString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  );
};

export default ContractControls;