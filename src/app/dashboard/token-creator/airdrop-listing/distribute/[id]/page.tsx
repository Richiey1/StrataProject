'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAccount, useWriteContract, useChainId, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
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
import DashBoardLayout from '../../../DashboardLayout';
import StrataForgeFactoryABI from '../../../../../components/ABIs/StrataForgeFactoryABI.json';
import { createMerkleTree, Recipient } from '../../../../../../lib/merkle';
import { ethers } from 'ethers';

type RecipientFile = {
  id: string;
  name: string;
  count: number;
  merkleRoot: string;
  recipients: Recipient[];
  proofs: { [address: string]: string[] };
};

interface TokenDetails {
  name: string;
  symbol: string;
  decimals: number;
}

interface AirdropInfo {
  distributor: string;
  tokenAddress: string;
  creator: string;
  startTime: bigint;
  totalRecipients: bigint;
  dropAmount: bigint;
  tokenType: number;
  reserved: number;
}

// Transaction states
type TransactionState = 'idle' | 'preparing' | 'approving' | 'approved' | 'creating' | 'success' | 'error';

const FACTORY_CONTRACT_ADDRESS = '0x3A1aCc78cc5ec3a320236f470319f60727De6Ed4' as const;
const BASE_SEPOLIA_CHAIN_ID = 84532;

// Minimal ERC20 ABI
const ERC20_ABI = [
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export default function CreateAirdropPage() {
  const { id: tokenAddress } = useParams<{ id: string }>();
  const { address: account, isConnected } = useAccount();
  const chainId = useChainId();
  const [tokenDetails, setTokenDetails] = useState<TokenDetails | null>(null);
  const [tokenAmount, setTokenAmount] = useState('');
  const [distributionMethod, setDistributionMethod] = useState('equal');
  const [scheduleDate, setScheduleDate] = useState('');
  const [files, setFiles] = useState<RecipientFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [distributorAddress, setDistributorAddress] = useState('');
  const [airdropIndex, setAirdropIndex] = useState<bigint | null>(null);
  const [transactionState, setTransactionState] = useState<TransactionState>('idle');
  const [approveHash, setApproveHash] = useState<`0x${string}` | null>(null);
  const [createHash, setCreateHash] = useState<`0x${string}` | null>(null);

  const { writeContract, isPending } = useWriteContract();

  // Wait for approve transaction
  const { isSuccess: approveSuccess, isError: approveError } = useWaitForTransactionReceipt({
    hash: approveHash ?? undefined,
    query: { enabled: !!approveHash },
  });

  // Wait for create transaction
  const { isSuccess: createSuccess, isError: createError } = useWaitForTransactionReceipt({
    hash: createHash ?? undefined,
    query: { enabled: !!createHash },
  });

  // Fetch token details
  useEffect(() => {
    const fetchTokenDetails = async () => {
      if (tokenAddress && isAddress(tokenAddress)) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
          const [name, symbol, decimals] = await Promise.all([
            tokenContract.name(),
            tokenContract.symbol(),
            tokenContract.decimals(),
          ]);
          setTokenDetails({
            name: name || 'Unknown Token',
            symbol: symbol || 'UNKNOWN',
            decimals: Number(decimals) || 18,
          });
          setError('');
        } catch (err) {
          console.error('Error fetching token details:', err);
          setError('Invalid token address or not an ERC20 token.');
          setTokenDetails(null);
        }
      } else {
        setError('Invalid token address.');
        setTokenDetails(null);
      }
    };

    if (chainId === BASE_SEPOLIA_CHAIN_ID) {
      fetchTokenDetails();
    }
  }, [tokenAddress, chainId]);

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

  // Set distributor address after airdrop creation
  useEffect(() => {
    if (airdropInfo && airdropIndex) {
      const { distributor } = airdropInfo as AirdropInfo;
      setDistributorAddress(distributor);
      localStorage.setItem('lastDistributorAddress', distributor);
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
    if (!isConnected) {
      setError('Please connect your wallet to Base Sepolia.');
    } else if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
      setError('Please switch to Base Sepolia network.');
    } else if (!tokenAddress || !isAddress(tokenAddress)) {
      setError('Invalid token address.');
    }
  }, [isConnected, chainId, tokenAddress]);

  // Reset transaction state

  // Create airdrop
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
      setError('Invalid token address.');
      return;
    }
    if (!tokenAmount || isNaN(Number(tokenAmount)) || Number(tokenAmount) <= 0) {
      setError('Enter a valid token amount.');
      return;
    }
    if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
      setError('Please connect to Base Sepolia network.');
      return;
    }
    if (!tokenDetails) {
      setError('Token details not loaded.');
      return;
    }

    try {
      setLoading(true);
      setTransactionState('preparing');

      const allRecipients = files.flatMap((file) => file.recipients);
      const totalRecipients = allRecipients.length;
      createMerkleTree(allRecipients);
      const dropAmount = parseUnits(tokenAmount, tokenDetails.decimals);
      const totalDropAmount = dropAmount * BigInt(totalRecipients);

      // Step 1: Approve token transfer
      setTransactionState('approving');
      const approveResult = await writeContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [FACTORY_CONTRACT_ADDRESS, totalDropAmount],
        account: account as `0x${string}`,
      });
      if (typeof approveResult === 'string') {
        setApproveHash(approveResult);
      }

    } catch (err) {
      console.error('Airdrop creation error:', err);
      setTransactionState('error');
      setError(err instanceof Error ? err.message : 'Airdrop creation failed.');
      setLoading(false);
    }
  };

  // Create airdrop after approval
  useEffect(() => {
    if (transactionState === 'approved' && tokenAddress && tokenDetails && files.length > 0) {
      const createAirdrop = async () => {
        try {
          setTransactionState('creating');
          const allRecipients = files.flatMap((file) => file.recipients);
          const totalRecipients = allRecipients.length;
          const { merkleRoot } = createMerkleTree(allRecipients);
          const dropAmount = parseUnits(tokenAmount, tokenDetails.decimals);
          const startTime = scheduleDate
            ? Math.floor(new Date(scheduleDate).getTime() / 1000)
            : Math.floor(Date.now() / 1000);

          const createResult = await writeContract({
            address: FACTORY_CONTRACT_ADDRESS,
            abi: StrataForgeFactoryABI,
            functionName: 'createERC20Airdrop',
            args: [tokenAddress, merkleRoot, dropAmount, BigInt(totalRecipients), BigInt(startTime)],
            account: account as `0x${string}`,
          });
          if (typeof createResult === 'string') {
            setCreateHash(createResult);
          }
        } catch (err) {
          console.error('Create airdrop error:', err);
          setTransactionState('error');
          setError(err instanceof Error ? err.message : 'Failed to create airdrop.');
          setLoading(false);
        }
      };
      createAirdrop();
    }
  }, [transactionState, tokenAddress, tokenDetails, files, tokenAmount, scheduleDate, writeContract, account]);

  // Handle success
  useEffect(() => {
    if (transactionState === 'success') {
      setLoading(false);
      setError('');
    }
  }, [transactionState]);

  // Status message
  const getTransactionStatusMessage = () => {
    switch (transactionState) {
      case 'preparing': return 'Preparing transaction...';
      case 'approving': return 'Approving token transfer...';
      case 'approved': return 'Approval confirmed, creating airdrop...';
      case 'creating': return 'Creating airdrop...';
      case 'success': return 'Airdrop created successfully!';
      case 'error': return 'Transaction failed.';
      default: return '';
    }
  };

  if (!isConnected || chainId !== BASE_SEPOLIA_CHAIN_ID || !tokenDetails) {
    return (
      <DashBoardLayout>
        <div className="min-h-screen bg-gradient-to-br from-[#1A0D23] to-[#2A1F36] p-4 md:p-8 relative">
          <Alert className="bg-red-500/10 border-red-500/20 rounded-xl p-4 flex items-center space-x-3 relative z-10">
            <AlertDescription className="text-red-300 font-medium">
              {error || 'Please connect to Base Sepolia and select a valid token.'}
            </AlertDescription>
            <Link href="/dashboard/token-creator">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                Go to Dashboard
              </Button>
            </Link>
          </Alert>
        </div>
      </DashBoardLayout>
    );
  }

  return (
    <DashBoardLayout>
      <div className="relative min-h-screen bg-gradient-to-br from-[#1A0D23] to-[#2A1F36]">
        <main className="container py-8 relative z-10">
          <div className="mb-6 flex items-center">
            <Link href="/dashboard/token-creator/airdrop-listing/upload">
              <Button
                variant="ghost"
                className="text-purple-100 hover:bg-purple-500/10 hover:text-purple-200"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Upload
              </Button>
            </Link>
            <h1 className="ml-4 text-2xl font-bold text-white">
              Create Airdrop for {tokenDetails.name}
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

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card className="bg-[#1E1425]/80 border-purple-500/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white">Create New Airdrop</CardTitle>
                      <CardDescription className="text-gray-300">
                        Configure airdrop parameters for {tokenDetails.name} ({tokenDetails.symbol})
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
                      ERC20
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