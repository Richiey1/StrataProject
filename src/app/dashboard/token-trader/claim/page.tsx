'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';

import { Button } from '../../../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../../../components/ui/card';
import { Input } from '../../../../../components/ui/input';
import { Label } from '../../../../../components/ui/label';
import { Alert, AlertDescription } from '../../../../../components/ui/alert';
import { ArrowLeft, Coins } from 'lucide-react';
import DashBoardLayout from '../../token-creator/DashboardLayout';

// Types
type RecipientFile = {
  id: string;
  name: string;
  count: number;
  merkleRoot: string;
  distributorAddress?: string;
  recipients: { address: string; amount?: string; proof?: string[] }[]; // Made amount optional
  proofs: { [address: string]: string[] };
};

// New Distributor ABI
const DISTRIBUTOR_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'token_', type: 'address' },
      { internalType: 'bytes32', name: 'merkleRoot_', type: 'bytes32' },
      { internalType: 'uint8', name: 'tokenType_', type: 'uint8' },
      { internalType: 'uint32', name: 'dropAmount_', type: 'uint32' },
      { internalType: 'uint256[]', name: 'tokenIds_', type: 'uint256[]' },
      { internalType: 'uint256', name: 'tokenId_', type: 'uint256' },
      { internalType: 'uint32', name: 'totalRecipients_', type: 'uint32' },
      { internalType: 'uint32', name: 'startTime_', type: 'uint32' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  { inputs: [], name: 'AirdropNotStarted', type: 'error' },
  { inputs: [], name: 'AlreadyClaimed', type: 'error' },
  { inputs: [], name: 'InvalidProof', type: 'error' },
  { inputs: [], name: 'TransferFailed', type: 'error' },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'recipient', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'tokenId', type: 'uint256' },
    ],
    name: 'Claimed',
    type: 'event',
  },
  {
    inputs: [{ internalType: 'bytes32[]', name: 'proof', type: 'bytes32[]' }],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claimedCount',
    outputs: [{ internalType: 'uint32', name: '', type: 'uint32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'dropAmount',
    outputs: [{ internalType: 'uint32', name: '', type: 'uint32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getRemainingTokens',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTokenIds',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'hasClaimed',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'merkleRoot',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256[]', name: '', type: 'uint256[]' },
      { internalType: 'uint256[]', name: '', type: 'uint256[]' },
      { internalType: 'bytes', name: '', type: 'bytes' },
    ],
    name: 'onERC1155BatchReceived',
    outputs: [{ internalType: 'bytes4', name: '', type: 'bytes4' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'bytes', name: '', type: 'bytes' },
    ],
    name: 'onERC1155Received',
    outputs: [{ internalType: 'bytes4', name: '', type: 'bytes4' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [],
    name: 'startTime',
    outputs: [{ internalType: 'uint32', name: '', type: 'uint32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes4', name: 'interfaceId', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'tokenId',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'tokenType',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalRecipients',
    outputs: [{ internalType: 'uint32', name: '', type: 'uint32' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Minimal ERC20 ABI for decimals and balanceOf
const ERC20_ABI = [
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Minimal ERC721 ABI for ownerOf
const ERC721_ABI = [
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Minimal ERC1155 ABI for balanceOf
const ERC1155_ABI = [
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
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

  // Airdrop info state with tokenType and tokenId for ERC1155
  const [airdropInfo, setAirdropInfo] = useState<{
    tokenAddress: string;
    dropAmount: string;
    startTime: string;
    merkleRoot: string;
    decimals: number;
    tokenType: number;
    tokenId?: string;
    tokenIds?: string[];
  } | null>(null);

  // Fetch distributor details
  const fetchDistributorDetails = async (contractAddress: string) => {
    if (!ethers.isAddress(contractAddress)) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, DISTRIBUTOR_ABI, provider);

      const [tokenAddress, dropAmount, startTime, merkleRoot, tokenType, tokenId, tokenIds] = await Promise.all([
        contract.token(),
        contract.dropAmount(),
        contract.startTime(),
        contract.merkleRoot(),
        contract.tokenType(),
        contract.tokenId(),
        contract.getTokenIds(),
      ]);

      // Fetch decimals only for ERC20
      let decimals = 0;
      if (Number(tokenType) === 0) {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        decimals = await tokenContract.decimals();
      }

      setAirdropInfo({
        tokenAddress,
        dropAmount: Number(tokenType) === 0 ? ethers.formatUnits(dropAmount, decimals) : dropAmount.toString(),
        startTime: new Date(Number(startTime) * 1000).toLocaleString(),
        merkleRoot,
        decimals: Number(decimals),
        tokenType: Number(tokenType),
        tokenId: Number(tokenType) === 2 ? tokenId.toString() : undefined,
        tokenIds: Number(tokenType) === 1 ? tokenIds.map((id: bigint) => id.toString()) : undefined,
      });
    } catch (err) {
      console.error('Error fetching distributor details:', err);
      setAirdropInfo(null);
    }
  };

  // Handle address change
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;
    setDistributorAddress(address);
    if (ethers.isAddress(address)) {
      fetchDistributorDetails(address);
    } else {
      setAirdropInfo(null);
    }
  };

  // Load previous distributor from localStorage
  useEffect(() => {
    const lastAddress = localStorage.getItem('lastDistributorAddress');
    if (lastAddress) {
      setDistributorAddress(lastAddress);
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

      // Load recipients and proofs from localStorage
      const storedFiles = localStorage.getItem('recipientFiles');
      if (!storedFiles)
        throw new Error('No recipient data found. Please upload recipients CSV first.');

      const files: RecipientFile[] = JSON.parse(storedFiles);
      if (!files.length)
        throw new Error('No recipient data found. Please upload recipients CSV first.');

      // Find user's data
      let userProof: string[] | null = null;
      const userAddress = address.toLowerCase();

      for (const file of files) {
        if (file.proofs && file.proofs[userAddress]) {
          userProof = file.proofs[userAddress];
          break;
        }

        if (file.recipients) {
          const recipient = file.recipients.find(
            (r: { address: string; amount?: string; proof?: string[] }) =>
              r.address && r.address.toLowerCase() === userAddress
          );

          if (recipient) {
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

      // Check token type
      const tokenType = await contract.tokenType();
      const tokenTypeNum = Number(tokenType);

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

      // Validate contract balance based on token type
      setStatusMessage('Checking contract balance...');
      const tokenAddress = await contract.token();
      console.log('🪙 Token address from MerkleDistributor:', tokenAddress);

      let dropAmountFormatted: string = '0';
      let userAmountWei: ethers.BigNumberish = 0;

      if (tokenTypeNum === 0) {
        // ERC20
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const decimals = await tokenContract.decimals();
        const contractBalance = await tokenContract.balanceOf(distributorAddress);
        console.log('📦 Raw contract token balance:', contractBalance.toString());
        console.log('📦 Formatted contract token balance:', ethers.formatUnits(contractBalance, decimals));

        const dropAmount = await contract.dropAmount();
        dropAmountFormatted = ethers.formatUnits(dropAmount, decimals);
        userAmountWei = dropAmount; // Use contract's dropAmount directly
        console.log('🎯 Contract drop amount (wei):', dropAmount.toString());
        console.log('🎯 Contract drop amount (formatted):', dropAmountFormatted);

        if (contractBalance < userAmountWei) {
          throw new Error("Contract doesn't have enough tokens to distribute.");
        }
      } else if (tokenTypeNum === 1) {
        // ERC721
        const tokenIds = await contract.getTokenIds();
        if (tokenIds.length === 0) {
          throw new Error('No token IDs available for ERC721 airdrop.');
        }
        const tokenContract = new ethers.Contract(tokenAddress, ERC721_ABI, provider);
        for (const tokenId of tokenIds) {
          const owner = await tokenContract.ownerOf(tokenId);
          if (owner.toLowerCase() !== distributorAddress.toLowerCase()) {
            throw new Error(`Distributor does not own ERC721 token ID ${tokenId}.`);
          }
        }
      } else if (tokenTypeNum === 2) {
        // ERC1155
        const tokenId = await contract.tokenId();
        const dropAmount = await contract.dropAmount();
        dropAmountFormatted = dropAmount.toString();
        const tokenContract = new ethers.Contract(tokenAddress, ERC1155_ABI, provider);
        const contractBalance = await tokenContract.balanceOf(distributorAddress, tokenId);
        console.log('📦 ERC1155 contract balance for token ID', tokenId.toString(), ':', contractBalance.toString());
        if (contractBalance < dropAmount) {
          throw new Error(`Contract doesn't have enough ERC1155 tokens (ID ${tokenId}) to distribute.`);
        }
      } else {
        throw new Error('Unsupported token type.');
      }

      // Execute claim transaction
      setStatusMessage('Sending claim transaction...');
      console.log('User Address:', address);
      console.log('User Proof:', userProof);

      // Estimate gas
      try {
        await contract.claim.estimateGas(userProof);
      } catch (estimateErr) {
        console.error('Gas estimation failed:', estimateErr);
        throw new Error('Transaction is likely to fail. Your proof may be invalid.');
      }

      // Send transaction
      const tx = await contract.claim(userProof, {
        gasLimit: 300000,
      });

      setStatusMessage('Waiting for transaction confirmation...');
      await tx.wait();

      localStorage.setItem('lastDistributorAddress', distributorAddress);
      let successMessage = '';
      if (tokenTypeNum === 0) {
        successMessage = `Airdrop claimed successfully! You received ${dropAmountFormatted} tokens. Transaction: ${tx.hash}`;
      } else if (tokenTypeNum === 1) {
        successMessage = `Airdrop claimed successfully! You received an ERC721 NFT. Transaction: ${tx.hash}`;
      } else if (tokenTypeNum === 2) {
        successMessage = `Airdrop claimed successfully! You received ${dropAmountFormatted} ERC1155 tokens. Transaction: ${tx.hash}`;
      }
      setSuccess(successMessage);
    } catch (err) {
      console.error('Claim Error:', err);

      const errorMessage = (err instanceof Error && err.message) || 'An unexpected error occurred.';
      if (errorMessage.includes('user rejected') || errorMessage.includes('rejected')) {
        setError('Transaction was rejected.');
      } else if (errorMessage.includes('AirdropNotStarted')) {
        setError('The airdrop has not started yet.');
      } else if (errorMessage.includes('AlreadyClaimed')) {
        setError('This address has already claimed the airdrop.');
      } else if (errorMessage.includes('InvalidProof')) {
        setError('Invalid merkle proof. Your address may not be on the allowlist.');
      } else if (errorMessage.includes('TransferFailed')) {
        setError('Token transfer failed.');
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
                
                {airdropInfo && (
                  <div className='space-y-2 p-4 bg-purple-800/20 rounded-lg border border-purple-500/20'>
                    <h3 className='text-lg font-semibold text-purple-100'>Airdrop Details</h3>
                    <div className='space-y-1 text-sm'>
                      <p>
                        <strong>Token Type:</strong> {airdropInfo.tokenType === 0 ? 'ERC20' : airdropInfo.tokenType === 1 ? 'ERC721' : 'ERC1155'}
                      </p>
                      <p>
                        <strong>Token Address:</strong> 
                        <span className='font-mono text-xs ml-2'>{airdropInfo.tokenAddress}</span>
                      </p>
                      {airdropInfo.tokenType === 0 && (
                        <p>
                          <strong>Drop Amount:</strong> {airdropInfo.dropAmount} tokens per claim
                        </p>
                      )}
                      {airdropInfo.tokenType === 1 && airdropInfo.tokenIds && (
                        <p>
                          <strong>Token IDs:</strong> {airdropInfo.tokenIds.join(', ')}
                        </p>
                      )}
                      {airdropInfo.tokenType === 2 && airdropInfo.tokenId && (
                        <p>
                          <strong>Token ID:</strong> {airdropInfo.tokenId}, Amount: {airdropInfo.dropAmount}
                        </p>
                      )}
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
                  <p className='text-center text-purple-100 text-sm'>
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