'use client';
import React, { useState, useEffect } from 'react';
import { useWallet } from '../../../../contexts/WalletContext';
import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { Abi, formatEther, parseEther } from 'viem';
import StrataForgeAdminABI from '../../../../app/components/ABIs/StrataForgeAdminABI.json';
import AdminDashboardLayout from '../AdminDashboardLayout';

const ADMIN_CONTRACT_ADDRESS = '0xADC01DF1dA777a7fE0A93eC58BfC6b69d3354599' as const;
const adminABI = StrataForgeAdminABI as Abi;
const EXPLORER_URL = 'https://sepolia.basescan.org/address';
const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const Withdrawals = () => {
  const { address, isConnected } = useWallet();
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [proposalId, setProposalId] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [isTxPending, setIsTxPending] = useState(false);

  // Wagmi write contract hook
  const { writeContract, error: writeError, isPending: isWritePending } = useWriteContract();

  // Wait for transaction receipt
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Get admin count
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

  // Get contract balance
  const {
    data: contractBalance,
    error: balanceError,
    isLoading: balanceLoading,
  } = useBalance({
    address: ADMIN_CONTRACT_ADDRESS,
    query: { enabled: isConnected, retry: 3, retryDelay: 1000 },
  });

  // Get contract state (minimumApprovals, proposalCounter, priceFeed)
  const {
    data: contractState,
    error: contractStateError,
    isLoading: contractStateLoading,
  } = useReadContracts({
    contracts: [
      {
        address: ADMIN_CONTRACT_ADDRESS,
        abi: adminABI,
        functionName: 'minimumApprovals',
      },
      {
        address: ADMIN_CONTRACT_ADDRESS,
        abi: adminABI,
        functionName: 'proposalCounter',
      },
      {
        address: ADMIN_CONTRACT_ADDRESS,
        abi: adminABI,
        functionName: 'priceFeed',
      },
    ],
    query: { enabled: isConnected, retry: 3, retryDelay: 1000 },
  });

  // Get latest ETH/USD price
  const {
    data: priceData,
    error: priceError,
    isLoading: priceLoading,
  } = useReadContract({
    address: contractState?.[2]?.result as `0x${string}` | undefined,
    abi: CHAINLINK_ABI,
    functionName: 'latestRoundData',
    query: { enabled: isConnected && !!contractState?.[2]?.result, retry: 3, retryDelay: 1000 },
  });

  // Create array of admin read calls
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

  // Fetch proposals
  const proposalCounter = Number(contractState?.[1]?.result) || 0;
  const proposalQueries = React.useMemo(() => {
    if (!isConnected || proposalCounter === 0) return [];
    return Array.from({ length: proposalCounter }, (_, i) => ({
      address: ADMIN_CONTRACT_ADDRESS as `0x${string}`,
      abi: adminABI,
      functionName: 'getProposal' as const,
      args: [BigInt(i)] as const,
    }));
  }, [isConnected, proposalCounter]);

  const {
    data: proposals,
    error: proposalsError,
    isLoading: proposalsLoading,
  } = useReadContracts({
    contracts: proposalQueries,
    query: { enabled: proposalQueries.length > 0, retry: 3, retryDelay: 1000 },
  });

  // Check admin status
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

  // Handle errors
  useEffect(() => {
    const errors: string[] = [];
    if (adminCountError) errors.push('Failed to load admin count');
    if (adminAddressesError) errors.push('Failed to load admin addresses');
    if (contractStateError) errors.push('Failed to load contract state');
    if (proposalsError) errors.push('Failed to load proposals');
    if (priceError) errors.push('Failed to load ETH/USD price');
    if (balanceError) errors.push('Failed to load contract balance');
    if (writeError) {
      const errorMessage = writeError.message.includes('NotAdmin') ? 'Only admins can perform this action' :
                           writeError.message.includes('InvalidProposal') ? 'Invalid proposal ID' :
                           writeError.message.includes('AlreadyApproved') ? 'Proposal already approved' :
                           writeError.message.includes('ProposalExecuted') ? 'Proposal already executed' :
                           writeError.message.includes('InsufficientBalance') ? 'Insufficient contract balance' :
                           writeError.message.includes('InvalidAmount') ? 'Invalid withdrawal amount' :
                           'Transaction failed';
      errors.push(errorMessage);
    }

    setError(errors.join(', '));
    if (!adminCountLoading && !adminAddressesLoading && !contractStateLoading && !proposalsLoading && !priceLoading && !balanceLoading && !isTxConfirming) {
      setLoading(false);
      setIsTxPending(false);
    }
  }, [adminCountError, adminAddressesError, contractStateError, proposalsError, priceError, balanceError, writeError, adminCountLoading, adminAddressesLoading, contractStateLoading, proposalsLoading, priceLoading, balanceLoading, isTxConfirming]);

  // Handle transaction success
  useEffect(() => {
    if (isTxSuccess && txHash) {
      setProposalId('');
      setWithdrawalAmount('');
      setTxHash(undefined);
      setIsTxPending(false);
    }
  }, [isTxSuccess, txHash]);

  // Propose withdrawal
  const handleProposeWithdrawal = () => {
    if (!withdrawalAmount || Number(withdrawalAmount) <= 0) {
      setError('Please enter a valid ETH amount');
      return;
    }
    const amountInWei = parseEther(withdrawalAmount);
    if (contractBalance && amountInWei > contractBalance.value) {
      setError('Withdrawal amount exceeds contract balance');
      return;
    }
    setIsTxPending(true);
    writeContract({
      address: ADMIN_CONTRACT_ADDRESS,
      abi: adminABI,
      functionName: 'proposeWithdrawal',
      args: [amountInWei], // Assumes recipient is handled by contract or msg.sender
    }, {
      onSuccess: (hash) => setTxHash(hash),
      onError: () => setIsTxPending(false),
    });
  };

  // Approve withdrawal
  const handleApproveWithdrawal = (proposalId: string) => {
    if (!proposalId || Number(proposalId) < 0 || Number(proposalId) >= proposalCounter) {
      setError('Please enter a valid proposal ID');
      return;
    }
    setIsTxPending(true);
    writeContract({
      address: ADMIN_CONTRACT_ADDRESS,
      abi: adminABI,
      functionName: 'approveWithdrawal',
      args: [BigInt(proposalId)],
    }, {
      onSuccess: (hash) => setTxHash(hash),
      onError: () => setIsTxPending(false),
    });
  };

  // Calculate USD equivalent
  const getUsdEquivalent = (ethAmount: bigint) => {
    if (!priceData || !priceData[1]) return 'N/A';
    const ethPrice = Number(priceData[1]) / 1e8; // Chainlink returns price with 8 decimals
    const eth = Number(formatEther(ethAmount));
    return (eth * ethPrice).toFixed(2);
  };

  // Format contract balance
  const formatContractBalance = () => {
    if (!contractBalance) return '0.0000';
    return Number(formatEther(contractBalance.value)).toFixed(4);
  };

  // Loading Component
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center min-h-screen bg-[#1A0D23] relative">
      <div className="text-center relative z-10">
        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white text-lg">Loading withdrawals...</p>
        {error && <p className="text-red-400 text-sm mt-2 max-w-md mx-auto">{error}</p>}
      </div>
    </div>
  );

  // Wallet Connection Component
  const WalletConnection = () => (
    <div className="min-h-screen bg-[#1A0D23] flex items-center justify-center p-4 relative">
      <div className="bg-[#1E1425]/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-purple-500/20 p-8 text-center relative z-10">
        <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
        <p className="text-gray-300 mb-6">Connect your wallet to manage withdrawals</p>
        <button
          onClick={() => document.querySelector('appkit-button')?.click()}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-xl hover:opacity-90 transition"
        >
          Connect Wallet
        </button>
      </div>
    </div>
  );

  // Unauthorized Access Component
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
            <p className="text-gray-300 mb-6">You are not authorized to manage withdrawals</p>
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

  const minimumApprovals = contractState?.[0]?.result?.toString() || '0';
  const ethPrice = priceData && priceData[1] ? (Number(priceData[1]) / 1e8).toFixed(2) : 'N/A';

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
            Withdrawal Management <span className="text-purple-400">💸</span>
          </h1>
          <p className="font-vietnam font-normal text-base leading-[170%] tracking-[1%] text-[hsl(var(--foreground)/0.7)]">
            Propose and approve withdrawal requests with real-time ETH/USD conversion.
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
          <h2 className="font-poppins font-semibold text-xl md:text-2xl mb-6">Withdrawal Status</h2>
          <div className="bg-[#1E1425]/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-purple-500/10 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-[#16091D]/60 rounded-xl">
              <h3 className="text-lg font-semibold text-white">Contract Balance</h3>
              <p className="text-2xl font-bold text-orange-400">{formatContractBalance()} ETH</p>
            </div>
            <div className="p-4 bg-[#16091D]/60 rounded-xl">
              <h3 className="text-lg font-semibold text-white">Minimum Approvals</h3>
              <p className="text-2xl font-bold text-purple-400">{minimumApprovals}</p>
            </div>
            <div className="p-4 bg-[#16091D]/60 rounded-xl">
              <h3 className="text-lg font-semibold text-white">Proposal Counter</h3>
              <p className="text-2xl font-bold text-purple-400">{proposalCounter}</p>
            </div>
            <div className="p-4 bg-[#16091D]/60 rounded-xl">
              <h3 className="text-lg font-semibold text-white">ETH/USD Price</h3>
              <p className="text-2xl font-bold text-purple-400">${ethPrice}</p>
            </div>
          </div>
        </div>

        <div className="mb-10 relative z-10">
          <h2 className="font-poppins font-semibold text-xl md:text-2xl mb-6">Propose Withdrawal</h2>
          <div className="bg-[#1E1425]/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-purple-500/10">
            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
              <input
                type="text"
                placeholder="Amount in ETH (e.g., 0.1)"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                className="w-full md:flex-1 bg-[#16091D]/60 border border-gray-700/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
              />
              <button
                onClick={handleProposeWithdrawal}
                disabled={isWritePending || isTxPending || isTxConfirming}
                className={`w-full md:w-auto px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ${
                  (isWritePending || isTxPending || isTxConfirming) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isWritePending || isTxPending || isTxConfirming ? 'Processing...' : 'Propose Withdrawal'}
              </button>
            </div>
            <p className="text-gray-300 text-sm mt-2">70% of admins need to approve before funds are dispensed.</p>
            {isTxPending && <p className="text-yellow-400 text-sm mt-2">Transaction pending: {txHash}</p>}
            {isTxSuccess && <p className="text-green-400 text-sm mt-2">Withdrawal proposed successfully!</p>}
          </div>
        </div>

        <div className="mb-10 relative z-10">
          <h2 className="font-poppins font-semibold text-xl md:text-2xl mb-6">Approve Withdrawal</h2>
          <div className="bg-[#1E1425]/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-purple-500/10">
            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
              <input
                type="number"
                placeholder="Enter proposal ID"
                value={proposalId}
                onChange={(e) => setProposalId(e.target.value)}
                className="w-full md:flex-1 bg-[#16091D]/60 border border-gray-700/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
              />
              <button
                onClick={() => handleApproveWithdrawal(proposalId)}
                disabled={isWritePending || isTxPending || isTxConfirming}
                className={`w-full md:w-auto px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ${
                  (isWritePending || isTxPending || isTxConfirming) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isWritePending || isTxPending || isTxConfirming ? 'Processing...' : 'Approve Withdrawal'}
              </button>
            </div>
            {isTxPending && <p className="text-yellow-400 text-sm mt-2">Transaction pending: {txHash}</p>}
            {isTxSuccess && <p className="text-green-400 text-sm mt-2">Withdrawal approved successfully!</p>}
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="font-poppins font-semibold text-xl md:text-2xl mb-6">Withdrawal Proposals</h2>
          <div className="bg-[#1E1425]/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-purple-500/10">
            {proposals && proposals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-white">
                  <thead>
                    <tr className="border-b border-gray-700/30">
                      <th className="py-3 px-4 font-semibold">ID</th>
                      <th className="py-3 px-4 font-semibold">Recipient</th>
                      <th className="py-3 px-4 font-semibold">ETH Amount</th>
                      <th className="py-3 px-4 font-semibold">USD Equivalent</th>
                      <th className="py-3 px-4 font-semibold">Approvals</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposals.map((proposal, index) => {
                      const result = proposal.result as [string, bigint, bigint, boolean] | undefined;
                      if (!result) return null;
                      const [recipient, amount, approvalCount, executed] = result;
                      return (
                        <tr key={index} className="border-b border-gray-700/30 hover:bg-[#16091D]/60">
                          <td className="py-3 px-4">{index}</td>
                          <td className="py-3 px-4">
                            <a
                              href={`${EXPLORER_URL}/${recipient}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline"
                            >
                              {recipient.slice(0, 6)}...{recipient.slice(-4)}
                            </a>
                          </td>
                          <td className="py-3 px-4">{formatEther(amount)} ETH</td>
                          <td className="py-3 px-4">${getUsdEquivalent(amount)}</td>
                          <td className="py-3 px-4">{approvalCount.toString()}</td>
                          <td className="py-3 px-4">
                            <span className={executed ? 'text-green-400' : 'text-yellow-400'}>
                              {executed ? 'Executed' : 'Pending'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleApproveWithdrawal(index.toString())}
                              disabled={isWritePending || isTxPending || isTxConfirming || executed}
                              className={`px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:shadow-xl transform hover:scale-105 transition-all duration-200 ${
                                (isWritePending || isTxPending || isTxConfirming || executed) ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              Approve
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-300 text-center">No withdrawal proposals found.</p>
            )}
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  );
};

export default Withdrawals;