'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';

import { Button } from '../../../../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../../../../components/ui/card';
import { Input } from '../../../../../../components/ui/input';
import { Label } from '../../../../../../components/ui/label';
import { Alert, AlertDescription } from '../../../../../../components/ui/alert';
import { ArrowLeft, Coins } from 'lucide-react';
import DashBoardLayout from '../../DashboardLayout';

// Constants
// Types
type RecipientFile = {
  id: string;
  name: string;
  count: number;
  merkleRoot: string;
  distributorAddress?: string;
  recipients: { address: string; amount: string; proof?: string[] }[];
  proofs: { [address: string]: string[] };
};

// Distributor contract ABI - Updated to match your specification
const DISTRIBUTOR_ABI = [
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'merkleProof', type: 'bytes32[]' },
    ],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'address' }],
    name: 'hasClaimed',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'startTime',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'dropAmount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'merkleRoot',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export default function ClaimPage() {
  const { address, isConnected } = useAccount();
  const [distributorAddress, setDistributorAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Add airdropInfo state
  const [airdropInfo, setAirdropInfo] = useState<{
    tokenAddress: string;
    dropAmount: string;
    startTime: string;
    merkleRoot: string;
  } | null>(null);

  // Fetch distributor details function
  const fetchDistributorDetails = async (contractAddress: string) => {
    if (!ethers.isAddress(contractAddress)) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, DISTRIBUTOR_ABI, provider);

      const [tokenAddress, dropAmount, startTime, merkleRoot] = await Promise.all([
        contract.token(),
        contract.dropAmount(),
        contract.startTime(),
        contract.merkleRoot(),
      ]);

      setAirdropInfo({
        tokenAddress,
        dropAmount: ethers.formatUnits(dropAmount, 18), // Assuming 18 decimals
        startTime: new Date(Number(startTime) * 1000).toLocaleString(),
        merkleRoot,
      });
    } catch (err) {
      console.error('Error fetching distributor details:', err);
      setAirdropInfo(null);
    }
  };

  // Handle address change function
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;
    setDistributorAddress(address);
    if (ethers.isAddress(address)) {
      fetchDistributorDetails(address);
    } else {
      setAirdropInfo(null);
    }
  };

  // Load previous distributor from local storage
  useEffect(() => {
    const lastAddress = localStorage.getItem('lastDistributorAddress');
    if (lastAddress) {
      setDistributorAddress(lastAddress);
      // Trigger fetchDistributorDetails for the loaded address
      if (ethers.isAddress(lastAddress)) {
        fetchDistributorDetails(lastAddress);
      }
    }
  }, []);

  const handleClaim = async () => {
    if (!window.ethereum) return setError('Please install MetaMask!');
    if (!isConnected || !address) return setError('Please connect your wallet!');
    if (!ethers.isAddress(distributorAddress))
      return setError('Enter a valid distributor address!');

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      setStatusMessage('Initializing claim process...');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Load recipients and proofs from local storage
      const storedFiles = localStorage.getItem('recipientFiles');
      if (!storedFiles)
        throw new Error('No recipient data found. Please upload recipients CSV first.');

      const files: RecipientFile[] = JSON.parse(storedFiles);
      if (!files.length)
        throw new Error('No recipient data found. Please upload recipients CSV first.');

      // Find user's data in saved files
      let userProof: string[] | null = null;
      let userAmount = '0';
      const userAddress = address.toLowerCase();

      // Search through each file for the user's address and proof
      for (const file of files) {
        // Check if proofs exist directly in the file structure
        if (file.proofs && file.proofs[userAddress]) {
          userProof = file.proofs[userAddress];
          // Find the amount from recipients
          const recipient = file.recipients.find(
            (r) => r.address && r.address.toLowerCase() === userAddress
          );
          if (recipient) {
            userAmount = recipient.amount;
          }
          break;
        }

        // Check if we need to search through recipients
        if (file.recipients) {
          const recipient = file.recipients.find(
            (r: { address: string; amount: string; proof?: string[] }) =>
              r.address && r.address.toLowerCase() === userAddress
          );

          if (recipient) {
            userAmount = recipient.amount;
            // If proof is stored with recipient
            if (recipient.proof) {
              userProof = recipient.proof;
            } else if (file.proofs && file.proofs[userAddress]) {
              userProof = file.proofs[userAddress];
            }
            break;
          }
        }
      }

      if (!userProof) throw new Error('Your address is not whitelisted for this airdrop.');

      // Initialize contract
      setStatusMessage('Connecting to contract...');
      const contract = new ethers.Contract(distributorAddress, DISTRIBUTOR_ABI, signer);

      // Check if already claimed
      const claimed = await contract.hasClaimed(address);
      if (claimed) throw new Error('This address has already claimed the airdrop.');

      // Check if airdrop has started
      const startTime = await contract.startTime();
      const now = Math.floor(Date.now() / 1000);
      if (now < Number(startTime)) {
        const startDate = new Date(Number(startTime) * 1000);
        throw new Error(`Airdrop not started. Starts at ${startDate.toLocaleString()}`);
      }

      // Check token balance of contract
      setStatusMessage('Checking contract balance...');

      const tokenAddress = await contract.token();
      console.log('🪙 Token address from MerkleDistributor:', tokenAddress);

      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function balanceOf(address) view returns (uint256)'],
        provider,
      );

      const contractBalance = await tokenContract.balanceOf(distributorAddress);
      console.log('📦 Raw contract token balance:', contractBalance.toString());
      console.log('📦 Formatted contract token balance:', ethers.formatUnits(contractBalance, 18));

      // Convert user amount to wei
      const userAmountWei = ethers.parseUnits(userAmount, 18);
      console.log('🎯 User claim amount (wei):', userAmountWei.toString());
      console.log('🎯 User claim amount (formatted):', userAmount);

      // Compare and throw error if not enough tokens
      if (contractBalance < userAmountWei) {
        throw new Error("Contract doesn't have enough tokens to distribute.");
      }

      // Execute claim transaction
      setStatusMessage('Sending claim transaction...');
      console.log('User Address:', address);
      console.log('User Amount (wei):', userAmountWei.toString());
      console.log('User Proof:', userProof);

      // Estimate gas to catch potential errors before sending
      try {
        await contract.claim.estimateGas(address, userAmountWei, userProof);
      } catch (estimateErr) {
        console.error('Gas estimation failed:', estimateErr);
        throw new Error('Transaction is likely to fail. Your proof may be invalid.');
      }

      // Send transaction with correct parameters: account, amount, merkleProof
      const tx = await contract.claim(address, userAmountWei, userProof, {
        gasLimit: 300000, // Set explicit gas limit as fallback
      });

      setStatusMessage('Waiting for transaction confirmation...');
      await tx.wait();

      localStorage.setItem('lastDistributorAddress', distributorAddress);
      setSuccess(`Airdrop claimed successfully! You received ${userAmount} tokens. Transaction: ${tx.hash}`);
    } catch (err) {
      console.error('Claim Error:', err);

      // Handle specific contract errors
      const errorMessage = (err instanceof Error && err.message) || 'An unexpected error occurred.';
      if (errorMessage.includes('user rejected') || errorMessage.includes('rejected')) {
        setError('Transaction was rejected.');
      } else if (errorMessage.includes('AirdropNotStarted')) {
        setError('The airdrop has not started yet.');
      } else if (errorMessage.includes('AlreadyClaimed')) {
        setError('This address has already claimed the airdrop.');
      } else if (errorMessage.includes('InvalidProof')) {
        setError('Invalid merkle proof. Your address may not be on the allowlist.');
      } else if (errorMessage.includes('InsufficientTokens')) {
        setError("The contract doesn't have enough tokens to fulfill your claim.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  return (
    <DashBoardLayout>
      <div className='bg-[#201726] text-purple-100 min-h-screen'>
        <header className='border-b border-purple-500/20 p-4'>
          <div className='container flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Coins className='h-6 w-6' />
              <span className='text-xl font-bold'>LaunchPad</span>
            </div>
          </div>
        </header>

        <main className='container py-8'>
          <div className='mb-6 flex items-center'>
            <Link href='/dashboard/airdrop-listing'>
              <Button
                variant='ghost'
                className='text-purple-100 hover:bg-purple-500/10 hover:text-purple-200'
              >
                <ArrowLeft className='mr-2 h-4 w-4' />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className='ml-4 text-2xl font-bold'>Claim Airdrop</h1>
          </div>

          <div className='max-w-2xl mx-auto'>
            <Card className='bg-zinc-900 border-purple-500/20'>
              <CardHeader>
                <CardTitle className='text-purple-100'>Claim Your Tokens</CardTitle>
                <CardDescription className='text-purple-100/70'>
                  Enter your airdrop distributor address and claim your tokens
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div>
                  <Label htmlFor='distributorAddress'>Distributor Address</Label>
                  <Input
                    id='distributorAddress'
                    placeholder='0x...'
                    value={distributorAddress}
                    onChange={handleAddressChange}
                    className='mt-1.5 bg-purple-800/40 border-purple-500/20 focus:border-purple-500'
                  />
                </div>
                
                {/* Airdrop details display */}
                {airdropInfo && (
                  <div className='space-y-2 p-4 bg-purple-800/20 rounded-lg border border-purple-500/20'>
                    <h3 className='text-lg font-semibold text-purple-100'>Airdrop Details</h3>
                    <div className='space-y-1 text-sm'>
                      <p>
                        <strong>Token Address:</strong> 
                        <span className='font-mono text-xs ml-2'>{airdropInfo.tokenAddress}</span>
                      </p>
                      <p>
                        <strong>Drop Amount:</strong> {airdropInfo.dropAmount} tokens per claim
                      </p>
                      <p>
                        <strong>Start Time:</strong> {airdropInfo.startTime}
                      </p>
                      <p>
                        <strong>Merkle Root:</strong> 
                        <span className='font-mono text-xs ml-2'>{airdropInfo.merkleRoot}</span>
                      </p>
                    </div>
                  </div>
                )}

                {statusMessage && (
                  <Alert className='bg-blue-500/10 border-blue-500/20'>
                    <AlertDescription>{statusMessage}</AlertDescription>
                  </Alert>
                )}
                
                {error && (
                  <Alert className='bg-red-500/10 border-red-500/20'>
                    <AlertDescription className='text-red-200'>{error}</AlertDescription>
                  </Alert>
                )}
                
                {success && (
                  <Alert className='bg-green-500/10 border-green-500/20'>
                    <AlertDescription className='text-green-200'>{success}</AlertDescription>
                  </Alert>
                )}
                
                <Button
                  className='w-full bg-purple-500 hover:bg-purple-600 text-black font-semibold'
                  onClick={handleClaim}
                  disabled={!distributorAddress || loading || !isConnected}
                >
                  {loading ? 'Claiming...' : 'Claim Airdrop'}
                </Button>
                
                {!isConnected && (
                  <p className='text-center text-purple-300 text-sm'>
                    Please connect your wallet to claim tokens
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </DashBoardLayout>
  );
}