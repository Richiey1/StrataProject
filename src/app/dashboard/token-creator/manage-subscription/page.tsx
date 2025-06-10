'use client';
import React, { useState, useEffect } from 'react';
import { useWallet } from '../../../../contexts/WalletContext';
import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Abi } from 'viem';
import StrataForgeAdminABI from '../../../../app/components/ABIs/StrataForgeAdminABI.json';
import DashboardLayout from '../DashboardLayout';

const ADMIN_CONTRACT_ADDRESS = '0xADC01DF1dA777a7fE0A93eC58BfC6b69d3354599' as const;
const adminABI = StrataForgeAdminABI as Abi;
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

const ManageSubscription = () => {
  const { address, isConnected } = useWallet();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [processingPlanIndex, setProcessingPlanIndex] = useState<number | null>(null); // Track which plan is processing

  // Wagmi write contract hook
  const { writeContract, error: writeError, isPending: isWritePending } = useWriteContract();

  // Wait for transaction receipt
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Fetch subscription status
  const {
    data: subData,
    error: subError,
    isLoading: subLoading,
  } = useReadContract({
    address: ADMIN_CONTRACT_ADDRESS,
    abi: adminABI,
    functionName: 'getSubscription',
    args: [address],
    query: { enabled: isConnected && !!address, retry: 3, retryDelay: 1000 },
  });

  // Fetch fees and price feed
  const {
    data: contractData,
    error: contractError,
    isLoading: contractLoading,
  } = useReadContracts({
    contracts: [
      { address: ADMIN_CONTRACT_ADDRESS, abi: adminABI, functionName: 'classicFee' },
      { address: ADMIN_CONTRACT_ADDRESS, abi: adminABI, functionName: 'proFee' },
      { address: ADMIN_CONTRACT_ADDRESS, abi: adminABI, functionName: 'premiumFee' },
      { address: ADMIN_CONTRACT_ADDRESS, abi: adminABI, functionName: 'priceFeed' },
    ],
    query: { enabled: isConnected, retry: 3, retryDelay: 1000 },
  });

  // Get latest ETH/USD price
  const {
    data: priceData,
    error: priceError,
    isLoading: priceLoading,
  } = useReadContract({
    address: contractData?.[3]?.result as `0x${string}` | undefined,
    abi: CHAINLINK_ABI,
    functionName: 'latestRoundData',
    query: { enabled: isConnected && !!contractData?.[3]?.result, retry: 3, retryDelay: 1000 },
  });

  // Process subscription data
  const [subscription, setSubscription] = useState<{
    plan: string;
    tokensRemaining: number;
    expiry: number;
  } | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      setLoading(false);
      return;
    }

    if (subData) {
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
    }
    setLoading(false);
  }, [isConnected, address, subData]);

  // Handle errors
  useEffect(() => {
    const errors: string[] = [];
    if (subError) errors.push('Failed to load subscription data');
    if (contractError) errors.push('Failed to load contract data');
    if (priceError) errors.push('Failed to load ETH/USD price');
    if (writeError) {
      const errorMessage = writeError.message.includes('InsufficientFunds') ? 'Insufficient ETH balance' :
                           writeError.message.includes('AlreadySubscribed') ? 'Already subscribed to this plan' :
                           'Transaction failed';
      errors.push(errorMessage);
    }
    setError(errors.join(', '));
    if (!subLoading && !contractLoading && !priceLoading && !isTxConfirming) {
      setLoading(false);
      setProcessingPlanIndex(null); // Reset processing state when not loading
    }
  }, [subError, contractError, priceError, writeError, subLoading, contractLoading, priceLoading, isTxConfirming]);

  // Handle transaction success
  useEffect(() => {
    if (isTxSuccess && txHash) {
      setTxHash(undefined);
      setProcessingPlanIndex(null); // Reset processing state on success
    }
  }, [isTxSuccess, txHash]);

  // Convert USD to ETH with buffer for gas fees
  const usdToEthWithBuffer = (usdAmount: bigint) => {
    if (!priceData || !priceData[1]) return { display: 'N/A', value: BigInt(0) };
    
    const ethPrice = Number(priceData[1]) / 1e8; // Chainlink returns price with 8 decimals
    const usd = Number(usdAmount) / 1e8; // Fees are in 8 decimals
    const ethAmount = usd / ethPrice;
    
    // Add 10% buffer for gas fees and price fluctuations
    const ethWithBuffer = ethAmount * 1.1;
    const ethWei = BigInt(Math.ceil(ethWithBuffer * 1e18)); // Convert to Wei
    
    return {
      display: ethAmount.toFixed(6),
      value: ethWei
    };
  };

  // Convert USD to ETH (display only)
  const usdToEth = (usdAmount: bigint) => {
    if (!priceData || !priceData[1]) return 'N/A';
    const ethPrice = Number(priceData[1]) / 1e8; // Chainlink returns price with 8 decimals
    const usd = Number(usdAmount) / 1e8; // Fees are in 8 decimals
    return (usd / ethPrice).toFixed(6);
  };

  // Purchase subscription
  const handlePurchaseSubscription = (tierIndex: number, fee: bigint) => {
    setProcessingPlanIndex(tierIndex); // Set only this plan as processing
    
    // Calculate the value to send (original fee + buffer for gas)
    const ethDetails = usdToEthWithBuffer(fee);
    
    writeContract({
      address: ADMIN_CONTRACT_ADDRESS,
      abi: adminABI,
      functionName: 'purchaseSubscription',
      args: [BigInt(tierIndex)],
      value: ethDetails.value, // Send buffered amount
    }, {
      onSuccess: (hash) => setTxHash(hash),
      onError: () => setProcessingPlanIndex(null), // Reset on error
    });
  };

  // Check if a specific plan is processing
  const isPlanProcessing = (tierIndex: number) => {
    return processingPlanIndex === tierIndex && (isWritePending || isTxConfirming);
  };

  // Plan data
  const plans = [
    {
      name: 'Free',
      tierIndex: 0,
      fee: BigInt(0),
      usdFee: 0,
      tokenLimit: 2,
      features: [
        'Create up to 2 tokens per month',
        'ERC-20 and ERC-721 token support',
        'Basic token creation tools',
      ],
      limitations: [
        'No ERC-1155 token support',
        'No Memecoin or Stablecoin support',
        'No airdrop functionality',
      ],
      icon: (
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
        </svg>
      ),
    },
    {
      name: 'Classic',
      tierIndex: 1,
      fee: contractData?.[0]?.result as bigint || BigInt(0),
      usdFee: contractData?.[0]?.result ? Number(contractData[0].result) / 10**8 : 0,
      tokenLimit: 5,
      features: [
        'Create up to 5 tokens per month',
        'ERC-20 and ERC-721 token support',
        'Basic token creation tools',
      ],
      limitations: [
        'No ERC-1155 token support',
        'No Memecoin or Stablecoin support',
        'No airdrop functionality',
      ],
      icon: (
        <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            strokeWidth="2"
          />
        </svg>
      ),
    },
    {
      name: 'Pro',
      tierIndex: 2,
      fee: contractData?.[1]?.result as bigint || BigInt(0),
      usdFee: contractData?.[1]?.result ? Number(contractData[1].result) / 10**8 : 0,
      tokenLimit: 10,
      features: [
        'Create up to 10 tokens per month',
        'ERC-20, ERC-721, and ERC-1155 token support',
        'Advanced token creation tools',
      ],
      limitations: [
        'No Memecoin or Stablecoin support',
        'No airdrop functionality',
      ],
      icon: (
        <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M4 12l8-8 8 8-8 8-8-8z" strokeWidth="2" />
        </svg>
      ),
    },
    {
      name: 'Premium',
      tierIndex: 3,
      fee: contractData?.[2]?.result as bigint || BigInt(0),
      usdFee: contractData?.[2]?.result ? Number(contractData[2].result) / 10**8 : 0,
      tokenLimit: Infinity,
      features: [
        'Unlimited token creation',
        'ERC-20, ERC-721, ERC-1155, Memecoin, and Stablecoin support',
        'Full access to all token creation tools',
        'Full airdrop and distribution functionality',
      ],
      limitations: [],
      icon: (
        <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M12 4c-4.42 0-8 1.79-8 4s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zm-8 8v4h4v-4H4zm8 0v4h4v-4h-4zm8 0v4h4v-4h-4z"
            strokeWidth="2"
          />
        </svg>
      ),
    },
  ];

  // Background Shapes Component
  const BackgroundShapes = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute top-20 left-10 w-32 h-32 border border-purple-500/10 rounded-full"></div>
      <div className="absolute top-40 right-20 w-24 h-24 border border-blue-500/10 rotate-45"></div>
      <div className="absolute bottom-32 left-20 w-40 h-40 border border-purple-400/8 rounded-2xl rotate-12"></div>
      <div className="absolute top-1/3 left-1/4 w-16 h-16 border border-cyan-500/10 rotate-45"></div>
      <div className="absolute bottom-1/4 right-1/3 w-28 h-28 border border-purple-300/8 rounded-full"></div>
      <div className="absolute top-10 right-1/3 w-64 h-64 bg-gradient-to-br from-purple-500/3 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-gradient-to-tr from-blue-500/3 to-transparent rounded-full blur-3xl"></div>
    </div>
  );

  // Loading Component
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center min-h-screen bg-[#1A0D23] relative">
      <BackgroundShapes />
      <div className="text-center relative z-10">
        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white text-lg">Loading subscription...</p>
        {error && <p className="text-red-400 text-sm mt-2 max-w-md mx-auto">{error}</p>}
      </div>
    </div>
  );

  // Wallet Connection Component
  const WalletConnection = () => (
    <div className="min-h-screen bg-[#1A0D23] flex items-center justify-center p-4 relative">
      <BackgroundShapes />
      <div className="bg-[#1E1425]/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-purple-500/20 p-8 text-center relative z-10">
        <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
        <p className="text-gray-300 mb-6">Connect your wallet to manage subscriptions</p>
        <button
          onClick={() => document.querySelector('appkit-button')?.click()}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-xl hover:opacity-90 transition"
        >
          Connect Wallet
        </button>
      </div>
    </div>
  );

  if (!isConnected) return <WalletConnection />;
  if (loading) return <LoadingSpinner />;

  const currentTierIndex = subscription ? plans.find(p => p.name === subscription.plan)?.tierIndex || 0 : 0;

  return (
    <DashboardLayout>
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
            Manage Your Subscription <span className="text-purple-400">💎</span>
          </h1>
          <p className="font-vietnam font-normal text-base leading-[170%] tracking-[1%] text-[hsl(var(--foreground)/0.7)]">
            Choose a plan to unlock token creation and airdrop features.
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
          <h2 className="font-poppins font-semibold text-xl md:text-2xl mb-6">Current Subscription</h2>
          <div className="bg-[#1E1425]/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-purple-500/10">
            {subscription ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-gray-300 text-sm">Plan</p>
                  <p className="text-white font-medium">{subscription.plan}</p>
                </div>
                <div>
                  <p className="text-gray-300 text-sm">Tokens Remaining</p>
                  <p className="text-white font-medium">
                    {subscription.tokensRemaining} / {plans.find(p => p.name === subscription.plan)?.tokenLimit === Infinity ? 'Unlimited' : plans.find(p => p.name === subscription.plan)?.tokenLimit || 2}
                  </p>
                </div>
                <div>
                  <p className="text-gray-300 text-sm">Expiry</p>
                  <p className="text-white font-medium">
                    {subscription.expiry && subscription.expiry > 0
                      ? new Date(subscription.expiry).toLocaleDateString()
                      : subscription.plan === 'Free'
                      ? 'No Expiry'
                      : 'N/A'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-400">No subscription data available.</p>
            )}
          </div>
        </div>

        <div className="mb-10 relative z-10">
          <h2 className="font-poppins font-semibold text-xl md:text-2xl mb-6">Subscription Plans</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className="bg-[#1E1425]/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-purple-500/10 relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300"
              >
                <div className="flex items-center space-x-3 mb-4">
                  {plan.icon}
                  <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                </div>
                <p className="text-gray-300 text-sm mb-2">
                  ${plan.usdFee.toFixed(2)} (~{usdToEth(plan.fee)} ETH)
                </p>
                <p className="text-gray-400 text-sm mb-4">30-day subscription</p>
                <div className="mb-4">
                  <p className="text-gray-300 text-sm font-medium">Features:</p>
                  <ul className="text-gray-400 text-sm list-disc list-inside">
                    {plan.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </div>
                {plan.limitations.length > 0 && (
                  <div className="mb-4">
                    <p className="text-gray-300 text-sm font-medium">Limitations:</p>
                    <ul className="text-gray-400 text-sm list-disc list-inside">
                      {plan.limitations.map((limitation, index) => (
                        <li key={index}>{limitation}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  onClick={() => handlePurchaseSubscription(plan.tierIndex, plan.fee)}
                  disabled={isPlanProcessing(plan.tierIndex) || plan.tierIndex === currentTierIndex || plan.tierIndex < currentTierIndex || plan.fee === BigInt(0)}
                  className={`w-full px-6 py-3 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ${
                    plan.tierIndex === currentTierIndex || plan.fee === BigInt(0)
                      ? 'bg-gray-600 cursor-not-allowed'
                      : plan.tierIndex < currentTierIndex
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-500 to-blue-600'
                  } ${isPlanProcessing(plan.tierIndex) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {plan.tierIndex === currentTierIndex
                    ? 'Current Plan'
                    : plan.tierIndex < currentTierIndex
                    ? 'Downgrade Not Allowed'
                    : plan.fee === BigInt(0) && plan.tierIndex !== 0
                    ? 'Loading Fee...'
                    : isPlanProcessing(plan.tierIndex)
                    ? 'Processing...'
                    : 'Select Plan'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {processingPlanIndex !== null && <p className="text-yellow-400 text-sm relative z-10">Transaction pending: {txHash}</p>}
        {isTxSuccess && <p className="text-green-400 text-sm relative z-10">Subscription updated successfully!</p>}
      </div>
    </DashboardLayout>
  );
};

export default ManageSubscription;