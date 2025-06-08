'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { Button } from '../../../../../../ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../../../../components/ui/select';
import { Switch } from '../../../../../../../components/ui/switch';
import { Alert, AlertDescription } from '../../../../../../../components/ui/alert';
import { ArrowLeft, Coins, Calendar, Info, Plus, X } from 'lucide-react';
import { Badge } from '../../../../../../../components/ui/badge';
import { Separator } from '../../../../../../../components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../../../../../components/ui/tooltip';
import { Textarea } from '../../../../../components/ui/textArea';
import DashBoardLayout from '../../../DashboardLayout';
import { createMerkleTree, Recipient } from '../../../../../../lib/merkle';

// Updated constants and ABIs
const FACTORY_CONTRACT_ADDRESS = '0x3A1aCc78cc5ec3a320236f470319f60727De6Ed4' as const;

// Enhanced ERC20 ABI with mint function and additional methods
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
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
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
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
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

// ERC721 ABI
const ERC721_ABI = [
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
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'approved', type: 'address' }
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'operator', type: 'address' }
    ],
    name: 'isApprovedForAll',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ERC1155 ABI
const ERC1155_ABI = [
  {
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' }
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'operator', type: 'address' }
    ],
    name: 'isApprovedForAll',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' }
    ],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Updated Factory ABI with all token types
const FACTORY_ABI = [
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'merkleRoot', type: 'bytes32' },
      { name: 'dropAmount', type: 'uint32' },
      { name: 'totalRecipients', type: 'uint32' },
      { name: 'startTime', type: 'uint32' }
    ],
    name: 'createERC20Airdrop',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'merkleRoot', type: 'bytes32' },
      { name: 'tokenIds', type: 'uint256[]' },
      { name: 'startTime', type: 'uint32' }
    ],
    name: 'createERC721Airdrop',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'merkleRoot', type: 'bytes32' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'dropAmount', type: 'uint32' },
      { name: 'totalRecipients', type: 'uint32' },
      { name: 'startTime', type: 'uint32' }
    ],
    name: 'createERC1155Airdrop',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'creator', type: 'address' },
      { indexed: true, name: 'distributor', type: 'address' },
      { indexed: true, name: 'token', type: 'address' },
      { indexed: false, name: 'tokenType', type: 'uint8' },
      { indexed: false, name: 'totalRecipients', type: 'uint32' },
      { indexed: false, name: 'airdropIndex', type: 'uint32' }
    ],
    name: 'AirdropCreated',
    type: 'event',
  },
] as const;

type RecipientFile = {
  id: string;
  name: string;
  count: number;
  merkleRoot: string;
  recipients: Recipient[];
  proofs: { [address: string]: string[] };
};

type TokenType = 'ERC20' | 'ERC721' | 'ERC1155';

export default function DistributePage() {
  const { isConnected } = useAccount();
  const [tokenName, setTokenName] = useState('WebCoin');
  const [tokenType, setTokenType] = useState<TokenType>('ERC20');
  const [tokenAmount, setTokenAmount] = useState('');
  const [contractAddress, setContractAddress] = useState(
    process.env.NEXT_PUBLIC_TOKEN_ADDRESS || '',
  );
  const [distributionMethod, setDistributionMethod] = useState('equal');
  const [scheduleDate, setScheduleDate] = useState('');
  const [gasOptimization, setGasOptimization] = useState(true);
  const [batchSize, setBatchSize] = useState('100');
  const [files, setFiles] = useState<RecipientFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [distributorAddress, setDistributorAddress] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [mintStatus, setMintStatus] = useState('');
  const [mintLoading, setMintLoading] = useState(false);

  // ERC721 specific states
  const [nftTokenIds, setNftTokenIds] = useState<string[]>(['']);

  // ERC1155 specific states
  const [erc1155TokenId, setErc1155TokenId] = useState('');

  // Load files from local storage
  useEffect(() => {
    const storedFiles = typeof window !== 'undefined' ? localStorage.getItem('recipientFiles') : null;
    if (storedFiles) {
      setFiles(JSON.parse(storedFiles));
    }
  }, []);

  const handleMaxAmount = () => {
    setTokenAmount('1000'); // Example max amount
  };

  const addNftTokenId = () => {
    setNftTokenIds([...nftTokenIds, '']);
  };

  const removeNftTokenId = (index: number) => {
    if (nftTokenIds.length > 1) {
      setNftTokenIds(nftTokenIds.filter((_, i) => i !== index));
    }
  };

  const updateNftTokenId = (index: number, value: string) => {
    const newIds = [...nftTokenIds];
    newIds[index] = value;
    setNftTokenIds(newIds);
  };

  const handleBulkNftTokenIds = (value: string) => {
    const ids = value.split(',').map(id => id.trim()).filter(id => id);
    setNftTokenIds(ids.length > 0 ? ids : ['']);
  };

  // Get appropriate ABI based on token type
  const getTokenABI = () => {
    switch (tokenType) {
      case 'ERC20':
        return ERC20_ABI;
      case 'ERC721':
        return ERC721_ABI;
      case 'ERC1155':
        return ERC1155_ABI;
      default:
        return ERC20_ABI;
    }
  };

  // Modified handleMint function for ERC20 only
  const handleMint = async () => {
    if (tokenType !== 'ERC20') {
      setError('Minting is only available for ERC20 tokens');
      return;
    }

    if (!window.ethereum) {
      setError('Please install MetaMask or another wallet!');
      return;
    }
    if (!isConnected) {
      setError('Please connect your wallet!');
      return;
    }
    if (!ethers.isAddress(distributorAddress)) {
      setError('No valid distributor address available. Create an airdrop first.');
      return;
    }
    if (!mintAmount || isNaN(Number(mintAmount)) || Number(mintAmount) <= 0) {
      setError('Enter a valid mint amount.');
      return;
    }

    try {
      setMintLoading(true);
      setError('');
      setMintStatus('Minting tokens to distributor...');

      // Initialize provider and signer with window.ethereum
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Initialize token contract
      const tokenContract = new ethers.Contract(contractAddress, ERC20_ABI, signer);

      // Parse mint amount
      const amountToMint = ethers.parseUnits(mintAmount, 18); // Assuming 18 decimals

      // Mint tokens
      const mintTx = await tokenContract.mint(distributorAddress, amountToMint);
      console.log('Mint transaction sent:', mintTx.hash);
      await mintTx.wait();
      console.log('Mint transaction confirmed');

      setMintStatus(`Successfully minted ${mintAmount} tokens to ${distributorAddress}`);
    } catch (mintErr) {
      console.error('Minting error:', mintErr);
      setError(`Minting failed: ${(mintErr as Error).message}`);
      setMintStatus('');
    } finally {
      setMintLoading(false);
    }
  };

  const handleDistribute = async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask!');
      return;
    }
    if (!isConnected) {
      setError('Please connect your wallet!');
      return;
    }
    if (files.length === 0) {
      setError('No recipient files uploaded.');
      return;
    }

    // Validate token type specific fields
    if (tokenType === 'ERC721') {
      const validTokenIds = nftTokenIds.filter(id => id.trim() && !isNaN(Number(id.trim())));
      if (validTokenIds.length === 0) {
        setError('Please provide valid NFT Token IDs for ERC721 airdrop.');
        return;
      }
    }

    if (tokenType === 'ERC1155') {
      if (!erc1155TokenId.trim() || isNaN(Number(erc1155TokenId.trim()))) {
        setError('Please provide a valid Token ID for ERC1155 airdrop.');
        return;
      }
      if (!tokenAmount || isNaN(Number(tokenAmount)) || Number(tokenAmount) <= 0) {
        setError('Please provide a valid amount for ERC1155 airdrop.');
        return;
      }
    }

    try {
      setLoading(true);
      setError('');
      setDistributorAddress('');

      // Connect to MetaMask
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Use the updated factory address
      const factoryAddress = FACTORY_CONTRACT_ADDRESS;
      if (!ethers.isAddress(contractAddress)) {
        throw new Error('Invalid token contract address');
      }

      // Initialize contracts
      const factoryContract = new ethers.Contract(factoryAddress, FACTORY_ABI, signer);
      const tokenContract = new ethers.Contract(contractAddress, getTokenABI(), signer);

      // Combine recipients from all files
      const allRecipients = files.flatMap((file) => file.recipients);
      const totalRecipients = allRecipients.length;

      // Regenerate merkle tree to ensure it's up to date
      const { merkleRoot } = createMerkleTree(allRecipients);

      // Set start time - Convert to uint32
      const startTime = scheduleDate
        ? Math.floor(new Date(scheduleDate).getTime() / 1000)
        : Math.floor(Date.now() / 1000);

      let createTx;

      if (tokenType === 'ERC20') {
        // Parse amount properly - Convert to uint32 for the new contract
        const dropAmountFloat = parseFloat(tokenAmount || '100');
        const dropAmount = Math.floor(dropAmountFloat); // Convert to uint32
        const totalDropAmount = ethers.parseUnits((dropAmountFloat * totalRecipients).toString(), 18);

        console.log('Creating ERC20 airdrop with:', {
          tokenAddress: contractAddress,
          merkleRoot,
          dropAmount,
          totalRecipients,
          startTime,
        });

        // Approve token transfer for ERC20
        const approveTx = await tokenContract.approve(factoryAddress, totalDropAmount);
        await approveTx.wait();
        console.log('ERC20 approval complete');

        // Create ERC20 airdrop
        createTx = await factoryContract.createERC20Airdrop(
          contractAddress,
          merkleRoot,
          dropAmount,
          totalRecipients,
          startTime,
        );

      } else if (tokenType === 'ERC721') {
        // Parse token IDs
        const validTokenIds = nftTokenIds
          .filter(id => id.trim() && !isNaN(Number(id.trim())))
          .map(id => BigInt(id.trim()));

        if (validTokenIds.length !== totalRecipients) {
          throw new Error(`Number of NFT Token IDs (${validTokenIds.length}) must match number of recipients (${totalRecipients})`);
        }

        console.log('Creating ERC721 airdrop with:', {
          tokenAddress: contractAddress,
          merkleRoot,
          tokenIds: validTokenIds,
          startTime,
        });

        // Set approval for all NFTs
        const isApproved = await tokenContract.isApprovedForAll(await signer.getAddress(), factoryAddress);
        if (!isApproved) {
          const approveTx = await tokenContract.setApprovalForAll(factoryAddress, true);
          await approveTx.wait();
          console.log('ERC721 approval complete');
        }

        // Create ERC721 airdrop
        createTx = await factoryContract.createERC721Airdrop(
          contractAddress,
          merkleRoot,
          validTokenIds,
          startTime,
        );

      } else if (tokenType === 'ERC1155') {
        const tokenId = BigInt(erc1155TokenId.trim());
        const dropAmountFloat = parseFloat(tokenAmount || '1');
        const dropAmount = Math.floor(dropAmountFloat);

        console.log('Creating ERC1155 airdrop with:', {
          tokenAddress: contractAddress,
          merkleRoot,
          tokenId,
          dropAmount,
          totalRecipients,
          startTime,
        });

        // Set approval for all ERC1155 tokens
        const isApproved = await tokenContract.isApprovedForAll(await signer.getAddress(), factoryAddress);
        if (!isApproved) {
          const approveTx = await tokenContract.setApprovalForAll(factoryAddress, true);
          await approveTx.wait();
          console.log('ERC1155 approval complete');
        }

        // Create ERC1155 airdrop
        createTx = await factoryContract.createERC1155Airdrop(
          contractAddress,
          merkleRoot,
          tokenId,
          dropAmount,
          totalRecipients,
          startTime,
        );
      }

      console.log('Transaction sent:', createTx.hash);
      const receipt = await createTx.wait();
      console.log('Transaction confirmed:', receipt);

      // Extract distributor address from event
      const event = receipt.logs
        .filter((log: ethers.Log) => log && log.topics && log.topics.length > 0)
        .map((log: ethers.Log): ethers.LogDescription | undefined => {
          try {
            const result = factoryContract.interface.parseLog({
              topics: log.topics,
              data: log.data,
            });
            return result || undefined;
          } catch (e: unknown) {
            console.log(e);
            return undefined;
          }
        })
        .find(
          (e: ethers.LogDescription | undefined): e is ethers.LogDescription =>
            e !== undefined && e.name === 'AirdropCreated',
        );

      if (event && event.args) {
        const newDistributorAddress = event.args.distributor;
        setDistributorAddress(newDistributorAddress);
        // Save last distributor address for claim page
        if (typeof window !== 'undefined') {
          localStorage.setItem('lastDistributorAddress', newDistributorAddress);
        }
      } else {
        throw new Error('Failed to retrieve distributor address from transaction');
      }
    } catch (err) {
      console.error('Distribution error:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error occurred'}`);
    } finally {
      setLoading(false);
    }
  };

  const renderTokenSpecificFields = () => {
    switch (tokenType) {
      case 'ERC20':
        return (
          <div>
            <Label htmlFor='tokenAmount'>Token Amount (per recipient)</Label>
            <div className='flex mt-1.5'>
              <Input
                id='tokenAmount'
                type='number'
                placeholder='0.0'
                value={tokenAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTokenAmount(e.target.value)
                }
                className='bg-purple-800/40 border-purple-500/20 focus:border-purple-500'
              />
              <Button
                variant='outline'
                className='ml-2 border-purple-500 text-purple-100 hover:bg-purple-500/10'
                onClick={handleMaxAmount}
              >
                MAX
              </Button>
            </div>
          </div>
        );

      case 'ERC721':
        return (
          <div className='space-y-4'>
            <div>
              <Label>NFT Token IDs</Label>
              <div className='space-y-2 mt-1.5'>
                {nftTokenIds.map((tokenId, index) => (
                  <div key={index} className='flex gap-2'>
                    <Input
                      type='number'
                      placeholder={`Token ID ${index + 1}`}
                      value={tokenId}
                      onChange={(e) => updateNftTokenId(index, e.target.value)}
                      className='bg-purple-800/40 border-purple-500/20 focus:border-purple-500'
                    />
                    {nftTokenIds.length > 1 && (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => removeNftTokenId(index)}
                        className='border-red-500 text-red-500 hover:bg-red-500/10'
                      >
                        <X className='h-4 w-4' />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant='outline'
                  size='sm'
                  onClick={addNftTokenId}
                  className='border-purple-500 text-purple-100 hover:bg-purple-500/10'
                >
                  <Plus className='h-4 w-4 mr-2' />
                  Add Token ID
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor='bulkTokenIds'>Bulk Add Token IDs (comma-separated)</Label>
              <Textarea
              id='bulkTokenIds'
              placeholder='1, 2, 3, 4, 5...'
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleBulkNftTokenIds(e.target.value)}
              className='mt-1.5 bg-purple-800/40 border-purple-500/20 focus:border-purple-500'
              />
            </div>
          </div>
        );

      case 'ERC1155':
        return (
          <div className='space-y-4'>
            <div>
              <Label htmlFor='erc1155TokenId'>Token ID</Label>
              <Input
                id='erc1155TokenId'
                type='number'
                placeholder='Token ID'
                value={erc1155TokenId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setErc1155TokenId(e.target.value)
                }
                className='mt-1.5 bg-purple-800/40 border-purple-500/20 focus:border-purple-500'
              />
            </div>
            <div>
              <Label htmlFor='tokenAmount'>Amount (per recipient)</Label>
              <Input
                id='tokenAmount'
                type='number'
                placeholder='Amount per recipient'
                value={tokenAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTokenAmount(e.target.value)
                }
                className='mt-1.5 bg-purple-800/40 border-purple-500/20 focus:border-purple-500'
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <DashBoardLayout>
      <div className='bg-#201726 text-purple-100 min-h-screen'>
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
            <Link href='/dashboard/airdrop-listing/upload'>
              <Button
                variant='ghost'
                className='text-purple-100 hover:bg-purple-500/10 hover:text-purple-200'
              >
                <ArrowLeft className='mr-2 h-4 w-4' />
                Back to Recipients
              </Button>
            </Link>
            <h1 className='ml-4 text-2xl font-bold'>Distribute Airdrop</h1>
          </div>

          {error && (
            <Alert className='mb-4 bg-red-500/10 border-red-500/20'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {distributorAddress && (
            <Alert className='mb-4 bg-green-500/10 border-green-500/20'>
              <AlertDescription>
                {tokenType} Airdrop created! Distributor Address: <code>{distributorAddress}</code>
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
              <AlertDescription>{mintStatus}</AlertDescription>
            </Alert>
          )}

          <div className='grid gap-6 lg:grid-cols-3'>
            <div className='lg:col-span-2'>
              <Card className='bg-zinc-900/10 border-purple-500/20'>
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <div>
                      <CardTitle>Create New Airdrop</CardTitle>
                      <CardDescription>
                        Configure your token distribution parameters
                      </CardDescription>
                    </div>
                    <Coins className='h-8 w-8 text-purple-400' />
                  </div>
                </CardHeader>
                <CardContent className='space-y-6'>
                  <div className='space-y-4'>
                    <div>
                      <Label htmlFor='tokenType'>Token Type</Label>
                      <Select value={tokenType} onValueChange={(value: TokenType) => setTokenType(value)}>
                        <SelectTrigger className='mt-1.5 bg-purple-800/40 border-purple-500/20 focus:border-purple-500'>
                          <SelectValue placeholder='Select token type' />
                        </SelectTrigger>
                        <SelectContent className='bg-purple-800/40 border-purple-500/20'>
                          <SelectItem value='ERC20'>ERC20 (Fungible Tokens)</SelectItem>
                          <SelectItem value='ERC721'>ERC721 (NFTs)</SelectItem>
                          <SelectItem value='ERC1155'>ERC1155 (Multi-Token)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor='tokenName'>Token Name</Label>
                      <Input
                        id='tokenName'
                        placeholder='Enter token name'
                        value={tokenName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setTokenName(e.target.value)
                        }
                        className='mt-1.5 bg-purple-800/40 border-purple-500/20 focus:border-purple-500'
                      />
                    </div>

                    {renderTokenSpecificFields()}

                    <div>
                      <Label htmlFor='contractAddress'>Token Contract Address</Label>
                      <Input
                        id='contractAddress'
                        placeholder='0x...'
                        value={contractAddress}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setContractAddress(e.target.value)
                        }
                        className='mt-1.5 bg-purple-800/40 border-purple-500/20 focus:border-purple-500'
                      />
                    </div>
                  </div>

                  <Separator className='bg-purple-500/20' />

                  <div>
                    <Label className='mb-2 block'>Recipients</Label>
                    <div className='flex flex-wrap gap-2'>
                      {files.map((file) => (
                        <Badge
                          key={file.id}
                          variant='outline'
                          className='border-purple-500 text-purple-100 px-3 py-1'
                        >
                          {file.name} ({file.count} addresses)
                        </Badge>
                      ))}
                      <Link href='/dashboard/airdrop-listing/upload'>
                        <Badge
                          variant='outline'
                          className='border-purple-500/50 text-purple-100/70 px-3 py-1 cursor-pointer hover:border-purple-500 hover:text-purple-100'
                        >
                          + Add more
                        </Badge>
                      </Link>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor='distributionMethod'>Distribution Method</Label>
                    <Select value={distributionMethod} onValueChange={setDistributionMethod}>
                      <SelectTrigger className='mt-1.5 bg-purple-800/40 border-purple-500/20 focus:border-purple-500'>
                        <SelectValue placeholder='Select distribution method' />
                      </SelectTrigger>
                      <SelectContent className='bg-purple-800/40 border-purple-500/20'>
                        <SelectItem value='equal'>Equal Split</SelectItem>
                        <SelectItem value='custom'>Custom Amounts (from CSV)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor='scheduleDate'>Schedule</Label>
                    <div className='flex mt-1.5'>
                      <Input
                        id='scheduleDate'
                        type='date'
                        value={scheduleDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setScheduleDate(e.target.value)
                        }
                        className='bg-purple-800/40 border-purple-500/20 focus:border-purple-500'
                      />
                      <Button
                        variant='outline'
                        className='ml-2 border-purple-500 text-purple-100 hover:bg-purple-500/10'
                      >
                        <Calendar className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>

                  {tokenType === 'ERC20' && (
                    <>
                      <Separator className='bg-purple-500/20' />
                      <div>
                        <Label htmlFor='mintAmount'>Mint Tokens to Distributor</Label>
                        <div className='space-y-4 mt-1.5'>
                          <div>
                            <Label htmlFor='mintRecipient'>Recipient (Distributor Address)</Label>
                            <Input
                              id='mintRecipient'
                              value={distributorAddress || 'Create airdrop to set recipient'}
                              readOnly
                              className='mt-1.5 bg-purple-800/40 border-purple-500/20'
                            />
                          </div>
                          <div>
                            <Label htmlFor='mintAmount'>Mint Amount</Label>
                            <Input
                              id='mintAmount'
                              type='number'
                              placeholder='0.0'
                              value={mintAmount}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setMintAmount(e.target.value)
                              }
                              className='mt-1.5 bg-purple-800/40 border-purple-500/20 focus:border-purple-500'
                            />
                          </div>
                          <Button
                            className='w-full bg-purple-500 hover:bg-purple-600 text-black'
                            onClick={handleMint}
                            disabled={!distributorAddress || !mintAmount || mintLoading || !isConnected}
                          >
                            {mintLoading ? 'Minting...' : 'Mint Tokens'}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className='bg-zinc-900/10 border-purple-500/20'>
                <CardHeader>
                  <CardTitle>Advanced Settings</CardTitle>
                </CardHeader>
                <CardContent className='space-y-6'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-2'>
                      <Label htmlFor='gasOptimization'>Gas Optimization</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className='h-4 w-4 text-purple-100/70' />
                          </TooltipTrigger>
                          <TooltipContent className='bg-purple-800/40 border-purple-500/20'>
                            <p>Optimize gas usage for large distributions</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Switch
                      id='gasOptimization'
                      checked={gasOptimization}
                      onCheckedChange={setGasOptimization}
                      className='data-[state=checked]:bg-purple-500'
                    />
                  </div>

                  <div>
                    <Label htmlFor='batchSize'>Batch Size</Label>
                    <Input
                      id='batchSize'
                      type='number'
                      value={batchSize}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setBatchSize(e.target.value)
                      }
                      className='mt-1.5 bg-purple-800/40 border-purple-500/20 focus:border-purple-500'
                    />
                  </div>

                  <Separator className='bg-purple-500/20' />

                  <div>
                    <div className='flex items-center justify-between mb-2'>
                      <Label>Estimated Gas:</Label>
                      <span className='font-mono'>0.05 ETH</span>
                    </div>
                    <div className='flex items-center justify-between mb-2'>
                      <Label>Total Recipients:</Label>
                      <span>{files.reduce((sum, file) => sum + file.count, 0)}</span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <Label>Distribution Type:</Label>
                      <Badge variant='outline' className='border-purple-500/50 text-purple-100'>
                        {distributionMethod === 'equal' ? 'Equal Split' : 'Custom'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className='w-full bg-purple-500 hover:bg-purple-600 text-black'
                    onClick={handleDistribute}
                    disabled={
                      !tokenName ||
                      !contractAddress ||
                      files.length === 0 ||
                      loading ||
                      !isConnected ||
                      (tokenType === 'ERC20' && (!tokenAmount || isNaN(Number(tokenAmount)) || Number(tokenAmount) <= 0)) ||
                      (tokenType === 'ERC721' && nftTokenIds.every(id => !id.trim() || isNaN(Number(id.trim())))) ||
                      (tokenType === 'ERC1155' && (!erc1155TokenId.trim() || isNaN(Number(erc1155TokenId.trim())) || !tokenAmount || isNaN(Number(tokenAmount)) || Number(tokenAmount) <= 0))
                    }
                  >
                    {loading ? 'Distributing...' : 'Distribute Airdrop'}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </DashBoardLayout>
  );
}