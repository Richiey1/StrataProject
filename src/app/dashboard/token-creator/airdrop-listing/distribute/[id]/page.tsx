'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAccount, useReadContract, useWriteContract, useChainId, useWaitForTransactionReceipt } from 'wagmi';
import { isAddress, parseUnits } from 'viem';
import { Button } from '../../../../../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../../../../../components/ui/card';
import { Input } from '../../../../../../../components/ui/input';
import { Label } from '../../../../../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../../../components/ui/select';
import { Alert, AlertDescription } from '../../../../../../../components/ui/alert';
import { ArrowLeft, Coins, Calendar } from 'lucide-react';
import { Badge } from '../../../../../../../components/ui/badge';
import { Separator } from '../../../../../../../components/ui/separator';
import DashBoardLayout from '../../../DashboardLayout';
import StrataForgeFactoryABI from '../../../../../components/ABIs/StrataForgeFactoryABI.json';
import StrataForgeERC20ImplementationABI from '../../../../../components/ABIs/StrataForgeERC20ImplementationABI.json';
import StrataForgeMemecoinImplementationABI from '../../../../../components/ABIs/StrataForgeMemecoinImplementationABI.json';
import StrataForgeStablecoinImplementationABI from '../../../../../components/ABIs/StrataForgeStablecoinImplementationABI.json';
import { createMerkleTree, Recipient } from '../../../../../../lib/merkle';

type RecipientFile = {
  id: string;
  name: string;
  count: number;
  merkleRoot: string;
  recipients: Recipient[];
  proofs: { [address: string]: string[] };
};

interface TokenInfo {
  tokenAddress: string;
  tokenType: bigint;
  name: string;
  symbol: string;
  initialSupply: bigint;
  timestamp: bigint;
  creator: string;
}

interface TokenDetails {
  name: string;
  symbol: string;
  decimals: number;
}

interface AirdropInfo {
  distributorAddress: string;
  tokenAddress: string;
  creator: string;
  startTime: bigint;
  totalRecipients: bigint;
  dropAmount: bigint;
}

// Transaction states
type TransactionState = 'idle' | 'preparing' | 'approving' | 'approved' | 'creating' | 'success' | 'error';

const FACTORY_CONTRACT_ADDRESS = '0x59F42c3eEcf829b34d8Ca846Dfc83D3cDC105C3F' as const;
const BASE_SEPOLIA_CHAIN_ID = 84532;

export default function CreateAirdropPage() {
  const { id: tokenId } = useParams<{ id: string }>();
  const router = useRouter();
  const { address: account, isConnected } = useAccount();
  const chainId = useChainId();
  const [tokenDetails, setTokenDetails] = useState<TokenDetails | null>(null);
  const [tokenAddress, setTokenAddress] = useState<string | null>(null);
  const [tokenType, setTokenType] = useState<'erc20' | 'meme' | 'stable' | null>(null);
  const [tokenAmount, setTokenAmount] = useState('');
  const [distributionMethod, setDistributionMethod] = useState('equal');
  const [scheduleDate, setScheduleDate] = useState('');
  const [files, setFiles] = useState<RecipientFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [distributorAddress, setDistributorAddress] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [mintStatus, setMintStatus] = useState('');
  const [mintLoading, setMintLoading] = useState(false);
  const [airdropIndex, setAirdropIndex] = useState<bigint | null>(null);
  const [transactionState, setTransactionState] = useState<TransactionState>('idle');
  const [approveHash, setApproveHash] = useState<`0x${string}` | null>(null);
  const [createHash, setCreateHash] = useState<`0x${string}` | null>(null);

  const { writeContract, isPending, error: writeError } = useWriteContract();

  // Wait for approve transaction
  const { isSuccess: approveSuccess, isError: approveError } = useWaitForTransactionReceipt({
    hash: approveHash ?? undefined,
    query: { enabled: !!approveHash }
  });

  // Wait for create transaction
  const { isSuccess: createSuccess, isError: createError } = useWaitForTransactionReceipt({
    hash: createHash ?? undefined,
    query: { enabled: !!createHash }
  });

  // ABIs for different token types
  const tokenABIs: Record<string, typeof StrataForgeERC20ImplementationABI> = {
    erc20: StrataForgeERC20ImplementationABI,
    meme: StrataForgeMemecoinImplementationABI,
    stable: StrataForgeStablecoinImplementationABI,
  };

  // Validate tokenId
  const isValidTokenId = tokenId && !isNaN(Number(tokenId)) && Number(tokenId) >= 0;

  // Redirect to dashboard if tokenId is invalid
  useEffect(() => {
    if (!isValidTokenId) {
      router.push('/dashboard/token-creator');
    }
  }, [isValidTokenId, router]);

  // Fetch TokenInfo from factory
  const { data: tokenInfo, error: tokenInfoError, isLoading: tokenInfoLoading } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: StrataForgeFactoryABI,
    functionName: 'getTokenById',
    args: isValidTokenId ? [BigInt(tokenId)] : undefined,
    query: { enabled: !!isValidTokenId },
  });

  // Extract tokenAddress and type
  useEffect(() => {
    console.log('tokenInfo:', tokenInfo, 'tokenInfoError:', tokenInfoError);
    if (tokenInfo) {
      const { tokenAddress, tokenType } = tokenInfo as TokenInfo;
      setTokenAddress(tokenAddress);
      const typeMap: { [key: number]: 'erc20' | 'meme' | 'stable' } = {
        0: 'erc20',
        3: 'meme',
        4: 'stable',
      };
      const newTokenType = typeMap[Number(tokenType)] || null;
      setTokenType(newTokenType);
      if (!newTokenType) {
        setError(`Unsupported token type: ${Number(tokenType)}. Only ERC20, Memecoin, or Stablecoin are supported.`);
      }
    } else if (tokenInfoError) {
      setError('Token not found for this ID. Please create a token first.');
    }
  }, [tokenInfo, tokenInfoError]);

  // Fetch token details
  const { data: name } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenType ? tokenABIs[tokenType] : tokenABIs.erc20,
    functionName: 'name',
    query: { enabled: !!tokenType && !!tokenAddress && isAddress(tokenAddress) },
  });

  const { data: symbol } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenType ? tokenABIs[tokenType] : tokenABIs.erc20,
    functionName: 'symbol',
    query: { enabled: !!tokenType && !!tokenAddress && isAddress(tokenAddress) },
  });

  const { data: decimals } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenType ? tokenABIs[tokenType] : tokenABIs.erc20,
    functionName: 'decimals',
    query: { enabled: !!tokenType && !!tokenAddress && isAddress(tokenAddress) },
  });

  const { data: collateralToken } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenABIs.stable,
    functionName: 'collateralToken',
    query: { enabled: !!tokenAddress && isAddress(tokenAddress) && tokenType === 'stable' },
  });

  // Fetch airdrop count to track new airdrop
  const { data: airdropCount } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: StrataForgeFactoryABI,
    functionName: 'getAirdropCount',
    query: { enabled: !!account },
  });

  // Fetch airdrop details after creation
  const { data: airdropInfo } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: StrataForgeFactoryABI,
    functionName: 'airdrops',
    args: [airdropIndex],
    query: { enabled: !!airdropIndex },
  });

  useEffect(() => {
    console.log('name:', name, 'symbol:', symbol, 'decimals:', decimals);
    if (name && symbol && decimals !== undefined) {
      setTokenDetails({ name: name as string, symbol: symbol as string, decimals: Number(decimals) });
    } else if (tokenAddress && tokenType) {
      if (!name || !symbol || decimals === undefined) {
        setError('Failed to fetch token details (name, symbol, or decimals).');
      }
    }
  }, [name, symbol, decimals, tokenAddress, tokenType]);

  // Set distributor address after airdrop creation
  useEffect(() => {
    if (airdropInfo && airdropIndex) {
      const { distributorAddress } = airdropInfo as AirdropInfo;
      setDistributorAddress(distributorAddress);
      localStorage.setItem('lastDistributorAddress', distributorAddress);
    }
  }, [airdropInfo, airdropIndex]);

  // Load recipient files from local storage
  useEffect(() => {
    const storedFiles = localStorage.getItem('recipientFiles');
    if (storedFiles) {
      setFiles(JSON.parse(storedFiles));
    }
  }, []);

  // Handle transaction state changes
  useEffect(() => {
    if (approveSuccess && transactionState === 'approving') {
      setTransactionState('approved');
      console.log('Approval successful, proceeding to create airdrop...');
    }
  }, [approveSuccess, transactionState]);

  useEffect(() => {
    if (createSuccess && transactionState === 'creating') {
      setTransactionState('success');
      console.log('Airdrop created successfully!');
      // Set airdrop index to fetch distributor address
      setAirdropIndex(airdropCount ? BigInt(Number(airdropCount)) : BigInt(0));
    }
  }, [createSuccess, transactionState, airdropCount]);

  useEffect(() => {
    if ((approveError || createError) && transactionState !== 'idle') {
      setTransactionState('error');
      setError('Transaction failed');
    }
  }, [approveError, createError, transactionState]);

  // Handle errors
  useEffect(() => {
    if (!isValidTokenId) {
      setError('Invalid token ID format. Please use a numeric ID (e.g., 1).');
    } else if (writeError && transactionState === 'idle') {
      setError(writeError.message || 'Transaction failed');
    } else if (!isConnected) {
      setError('Please connect your wallet to Base Sepolia.');
    } else if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
      setError('Please switch to Base Sepolia network.');
    }
  }, [isValidTokenId, writeError, isConnected, chainId, transactionState]);

  // Reset transaction state when needed
  const resetTransactionState = () => {
    setTransactionState('idle');
    setApproveHash(null);
    setCreateHash(null);
    setError('');
    setLoading(false);
  };

  // Approve collateral for stablecoin mint
  const handleApproveCollateral = async (collateralToken: string, amount: bigint) => {
    try {
      await writeContract({
        address: collateralToken as `0x${string}`,
        abi: StrataForgeERC20ImplementationABI,
        functionName: 'approve',
        args: [tokenAddress, amount],
        account: account as `0x${string}`,
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve collateral');
      return false;
    }
  };

  // Mint tokens to distributor
  const handleMint = async () => {
    if (!isConnected) {
      setError('Please connect your wallet!');
      return;
    }
    if (!tokenAddress || !isAddress(tokenAddress)) {
      setError('Invalid token address');
      return;
    }
    if (!distributorAddress || !isAddress(distributorAddress)) {
      setError('No valid distributor address available. Create an airdrop first.');
      return;
    }
    if (!mintAmount || isNaN(Number(mintAmount)) || Number(mintAmount) <= 0) {
      setError('Enter a valid mint amount.');
      return;
    }
    if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
      setError('Please connect to Base Sepolia network');
      return;
    }
    if (!tokenType || !tokenDetails) {
      setError('Token details not loaded');
      return;
    }

    try {
      setMintLoading(true);
      setError('');
      setMintStatus('Minting tokens to distributor...');

      const amountToMint = parseUnits(mintAmount, tokenDetails.decimals);

      // For stablecoin, approve collateral first
      if (tokenType === 'stable' && collateralToken) {
        const approved = await handleApproveCollateral(collateralToken as string, amountToMint);
        if (!approved) return;
      }

      // Mint tokens
      await writeContract({
        address: tokenAddress as `0x${string}`,
        abi: tokenABIs[tokenType],
        functionName: tokenType === 'stable' ? 'mint' : 'mint',
        args: tokenType === 'stable' ? [amountToMint] : [distributorAddress, amountToMint],
        account: account as `0x${string}`,
      });

      setMintStatus(`Successfully minted ${mintAmount} ${tokenDetails.symbol} to ${distributorAddress}`);
    } catch (err) {
      console.error('Minting error:', err);
      setError(err instanceof Error ? err.message : 'Minting failed');
      setMintStatus('');
    } finally {
      setMintLoading(false);
    }
  };

  // Create airdrop with proper transaction handling
  const handleDistribute = async () => {
    if (!isConnected) {
      setError('Please connect your wallet!');
      return;
    }
    if (files.length === 0) {
      setError('No recipient files uploaded.');
      return;
    }
    if (!tokenAddress || !isAddress(tokenAddress)) {
      setError('Invalid token address');
      return;
    }
    if (!tokenAmount || isNaN(Number(tokenAmount)) || Number(tokenAmount) <= 0) {
      setError('Enter a valid token amount.');
      return;
    }
    if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
      setError('Please connect to Base Sepolia network');
      return;
    }
    if (!tokenType || !tokenDetails) {
      setError('Token details not loaded');
      return;
    }

    // Reset previous state
    resetTransactionState();

    try {
      setLoading(true);
      setTransactionState('preparing');

      const allRecipients = files.flatMap((file) => file.recipients);
      const totalRecipients = allRecipients.length;
      const { merkleRoot } = createMerkleTree(allRecipients);
      const dropAmount = parseUnits(tokenAmount, tokenDetails.decimals);
      const totalDropAmount = dropAmount * BigInt(totalRecipients);
      const startTime = scheduleDate
        ? Math.floor(new Date(scheduleDate).getTime() / 1000)
        : Math.floor(Date.now() / 1000);

      console.log('Airdrop parameters:', {
        tokenAddress,
        merkleRoot,
        dropAmount: dropAmount.toString(),
        totalRecipients,
        startTime,
        totalDropAmount: totalDropAmount.toString()
      });

      // Step 1: Approve token transfer
      setTransactionState('approving');
      console.log('Step 1: Approving tokens...');
      
      const result = await writeContract({
        address: tokenAddress as `0x${string}`,
        abi: tokenABIs[tokenType],
        functionName: 'approve',
        args: [FACTORY_CONTRACT_ADDRESS, totalDropAmount],
        account: account as `0x${string}`,
      });
      // If writeContract returns void, do not setApproveHash; otherwise, set the hash if available
      if (typeof result === 'string') {
        setApproveHash(result as `0x${string}`);
        console.log('Approval transaction hash:', result);
      } else {
        setApproveHash(null);
        console.log('Approval transaction sent.');
      }

    } catch (err) {
      console.error('Airdrop creation error:', err);
      setTransactionState('error');
      setError(err instanceof Error ? err.message : 'Airdrop creation failed');
      setLoading(false);
    }
  };

  // Handle creating airdrop after approval is confirmed
  useEffect(() => {
    if (transactionState === 'approved' && tokenAddress && tokenType && tokenDetails && files.length > 0) {
      const createAirdrop = async () => {
        try {
          setTransactionState('creating');
          console.log('Step 2: Creating airdrop...');

          const allRecipients = files.flatMap((file) => file.recipients);
          const totalRecipients = allRecipients.length;
          const { merkleRoot } = createMerkleTree(allRecipients);
          const dropAmount = parseUnits(tokenAmount, tokenDetails.decimals);
          const startTime = scheduleDate
            ? Math.floor(new Date(scheduleDate).getTime() / 1000)
            : Math.floor(Date.now() / 1000);

          const createHash = await writeContract({
            address: FACTORY_CONTRACT_ADDRESS,
            abi: StrataForgeFactoryABI,
            functionName: 'createAirdrop',
            args: [tokenAddress, merkleRoot, dropAmount, BigInt(totalRecipients), BigInt(startTime)],
            account: account as `0x${string}`,
          });

          if (typeof createHash === 'string') {
            setCreateHash(createHash as `0x${string}`);
            console.log('Airdrop creation transaction hash:', createHash);
          } else {
            setCreateHash(null);
            console.log('Airdrop creation transaction sent.');
          }

        } catch (err) {
          console.error('Create airdrop error:', err);
          setTransactionState('error');
          setError(err instanceof Error ? err.message : 'Failed to create airdrop');
          setLoading(false);
        }
      };

      createAirdrop();
    }
  }, [transactionState, tokenAddress, tokenType, tokenDetails, files, tokenAmount, scheduleDate, writeContract, account]);

  // Handle final success state
  useEffect(() => {
    if (transactionState === 'success') {
      setLoading(false);
      setError('');
    }
  }, [transactionState]);

  // Get transaction status message
  const getTransactionStatusMessage = () => {
    switch (transactionState) {
      case 'preparing':
        return 'Preparing transaction...';
      case 'approving':
        return 'Approving token transfer...';
      case 'approved':
        return 'Approval confirmed, creating airdrop...';
      case 'creating':
        return 'Creating airdrop...';
      case 'success':
        return 'Airdrop created successfully!';
      case 'error':
        return 'Transaction failed';
      default:
        return '';
    }
  };

  if (tokenInfoLoading) {
    return (
      <DashBoardLayout>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#1A0D23] to-[#2A1F36] relative">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin relative z-10"></div>
        </div>
      </DashBoardLayout>
    );
  }

  if (!isValidTokenId) {
    return (
      <DashBoardLayout>
        <div className="min-h-screen bg-gradient-to-br from-[#1A0D23] to-[#2A1F36] p-4 md:p-8 relative">
          <div className="bg-red-500/10 border-red-500/20 rounded-xl p-4 flex items-center space-x-3 relative z-10">
            <p className="text-red-300 font-medium">Please select a token to create an airdrop.</p>
            <Link href="/dashboard/token-creator">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </DashBoardLayout>
    );
  }

  if (error && transactionState === 'idle' && (!tokenType || !tokenDetails || !tokenAddress)) {
    return (
      <DashBoardLayout>
        <div className="min-h-screen bg-gradient-to-br from-[#1A0D23] to-[#2A1F36] p-4 md:p-8 relative">
          <div className="bg-red-500/10 border-red-500/20 rounded-xl p-4 flex items-center space-x-3 relative z-10">
            <p className="text-red-300 font-medium">{error || 'Failed to load token data'}</p>
            <Link href="/dashboard/token-creator/create-tokens">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                Create a Token
              </Button>
            </Link>
          </div>
        </div>
      </DashBoardLayout>
    );
  }

  return (
    <DashBoardLayout>
      <div className="relative min-h-screen bg-gradient-to-br from-[#1A0D23] to-[#2A1F36]">
        <main className="container py-8 relative z-10">
          <div className="mb-6 flex items-center">
            <Link href={`/dashboard/tokens/${tokenId}`}>
              <Button
                variant="ghost"
                className="text-purple-100 hover:bg-purple-500/10 hover:text-purple-200"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Token Management
              </Button>
            </Link>
            <h1 className="ml-4 text-2xl font-bold text-white">
              Create Airdrop for {tokenDetails?.name || 'Token'}
            </h1>
          </div>

          {error && transactionState !== 'success' && (
            <Alert className="mb-4 bg-red-500/10 border-red-500/20">
              <AlertDescription className="text-red-300">{error}</AlertDescription>
            </Alert>
          )}

          {transactionState !== 'idle' && getTransactionStatusMessage() && (
            <Alert className="mb-4 bg-blue-500/10 border-blue-500/20">
              <AlertDescription className="text-blue-300">
                {getTransactionStatusMessage()}
                {(transactionState === 'approving' || transactionState === 'creating') && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                        style={{ width: transactionState === 'approving' ? '50%' : '100%' }}
                      ></div>
                    </div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {distributorAddress && transactionState === 'success' && (
            <Alert className="mb-4 bg-green-500/10 border-green-500/20">
              <AlertDescription className="text-green-300">
                Airdrop created successfully! Distributor Address: <code className="bg-green-500/20 px-2 py-1 rounded">{distributorAddress}</code>
              </AlertDescription>
            </Alert>
          )}

          {mintStatus && (
            <Alert
              className={`mb-4 ${
                mintStatus.includes('Failed')
                  ? 'bg-red-500/10 border-red-500/20'
                  : 'bg-blue-500/10 border-blue-500/20'
              }`}
            >
              <AlertDescription className={mintStatus.includes('Failed') ? 'text-red-300' : 'text-blue-300'}>
                {mintStatus}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card className="bg-[#1E1425]/80 border-purple-500/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white">Create New Airdrop</CardTitle>
                      <CardDescription className="text-gray-300">
                        Configure airdrop parameters for {tokenDetails?.name || 'Token'} ({tokenDetails?.symbol || 'SYM'})
                      </CardDescription>
                    </div>
                    <Coins className="h-8 w-8 text-purple-400" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="tokenAmount" className="text-white">Token Amount (per recipient)</Label>
                      <Input
                        id="tokenAmount"
                        type="number"
                        placeholder="0.0"
                        value={tokenAmount}
                        onChange={(e) => setTokenAmount(e.target.value)}
                        className="mt-1.5 bg-[#2A1F36] border-purple-500/20 focus:border-purple-500 text-white"
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <Label className="text-white">Recipients</Label>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {files.map((file) => (
                          <Badge
                            key={file.id}
                            variant="outline"
                            className="border-purple-500 text-purple-100 px-3 py-1"
                          >
                            {file.name} ({file.count} addresses)
                          </Badge>
                        ))}
                        <Link href="/dashboard/token-creator/airdrop-listing/upload">
                          <Badge
                            variant="outline"
                            className="border-purple-500/50 text-purple-100/70 px-3 py-1 cursor-pointer hover:border-purple-500 hover:text-purple-100"
                          >
                            + Add more
                          </Badge>
                        </Link>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="distributionMethod" className="text-white">Distribution Method</Label>
                      <Select value={distributionMethod} onValueChange={setDistributionMethod} disabled={loading}>
                        <SelectTrigger className="mt-1.5 bg-[#2A1F36] border-purple-500/20 focus:border-purple-500 text-white">
                          <SelectValue placeholder="Select distribution method" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#2A1F36] border-purple-500/20 text-white">
                          <SelectItem value="equal">Equal Split</SelectItem>
                          <SelectItem value="custom">Custom Amounts (from CSV)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="scheduleDate" className="text-white">Schedule (Optional)</Label>
                      <div className="flex mt-1.5">
                        <Input
                          id="scheduleDate"
                          type="datetime-local"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          className="bg-[#2A1F36] border-purple-500/20 focus:border-purple-500 text-white"
                          disabled={loading}
                        />
                        <Button
                          variant="outline"
                          className="ml-2 border-purple-500 text-purple-100 hover:bg-purple-500/10"
                          disabled={loading}
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-purple-500/20" />

                  <div>
                    <Label htmlFor="mintAmount" className="text-white">Mint Tokens to Distributor</Label>
                    <div className="space-y-4 mt-1.5">
                      <div>
                        <Label htmlFor="mintRecipient" className="text-white">Recipient (Distributor Address)</Label>
                        <Input
                          id="mintRecipient"
                          value={distributorAddress || 'Create airdrop to set recipient'}
                          readOnly
                          className="mt-1.5 bg-[#2A1F36] border-purple-500/20 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="mintAmount" className="text-white">Mint Amount</Label>
                        <Input
                          id="mintAmount"
                          type="number"
                          placeholder="0.0"
                          value={mintAmount}
                          onChange={(e) => setMintAmount(e.target.value)}
                          className="mt-1.5 bg-[#2A1F36] border-purple-500/20 focus:border-purple-500 text-white"
                          disabled={mintLoading}
                        />
                      </div>
                      <Button
                        className="w-full bg-gradient-to-r from-purple-500 to-blue-600 text-white hover:opacity-90"
                        onClick={handleMint}
                        disabled={mintLoading || !distributorAddress || transactionState !== 'idle'}
                      >
                        {mintLoading ? 'Minting...' : 'Mint Tokens'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:opacity-90"
                    onClick={handleDistribute}
                    disabled={loading || isPending || transactionState !== 'idle'}
                  >
                    {loading || isPending ? 'Creating Airdrop...' : 'Create Airdrop'}
                  </Button>
                </CardFooter>
              </Card>
            </div>

            <div>
              <Card className="bg-[#2A1F36]/80 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Token Information</CardTitle>
                  <CardDescription className="text-purple-100/70">
                    Details of the selected token
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-purple-100/70">Name</p>
                    <p className="font-semibold text-white">{tokenDetails?.name || 'Loading...'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-purple-100/70">Symbol</p>
                    <p className="font-semibold text-white">{tokenDetails?.symbol || 'Loading...'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-purple-100/70">Type</p>
                    <Badge variant="outline" className="border-purple-500 text-purple-100">
                      {tokenType ? tokenType.toUpperCase() : 'Loading...'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-purple-100/70">Token Address</p>
                    <p className="font-semibold text-white break-all">
                      {tokenAddress ? `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}` : 'Loading...'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </DashBoardLayout>
  );
}