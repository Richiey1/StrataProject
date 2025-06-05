'use client';
// /dashboard/token-creator/airdrop-listing/distribute/page.tsx

import React from 'react';

export default function DistributePage() {
  return (
    <div>
      <h1>Distribute Airdrop</h1>
      {/* Add your component logic/UI here */}
    </div>
  );
}

// 'use client';

// import { useState, useEffect } from 'react';
// import Link from 'next/link';
// import { useAccount } from 'wagmi';
// import { ethers } from 'ethers';
// import { Button } from '../../../../../../components/ui/button';
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardFooter,
//   CardHeader,
//   CardTitle,
// } from '../../../../../../components/ui/card';
// import { Input } from '../../../../../../components/ui/input';
// import { Label } from '../../../../../../components/ui/label';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '../../../../../../components/ui/select';
// import { Switch } from '../../../../../../components/ui/switch';
// import { Alert, AlertDescription } from '../../../../../../components/ui/alert';
// import { ArrowLeft, Coins, Calendar, Info } from 'lucide-react';
// import { Badge } from '../../../../../../components/ui/badge';
// import { Separator } from '../../../../../../components/ui/separator';
// import {
//   Tooltip,
//   TooltipContent,
//   TooltipProvider,
//   TooltipTrigger,
// } from '../../../../../../components/ui/tooltip';
// import DashBoardLayout from '../../DashboardLayout';
// import AirdropFactoryABI from '../../../../../lib/contracts/AirdropFactory.json';
// import WebCoinABI from '../../../../../lib/contracts/WebCoin.json';
// import { createMerkleTree, Recipient } from '../../../../../lib/merkle';

// type RecipientFile = {
//   id: string;
//   name: string;
//   count: number;
//   merkleRoot: string;
//   recipients: Recipient[];
//   proofs: { [address: string]: string[] };
// };

// export default function DistributePage() {
//   const { isConnected } = useAccount();
//   //const { data: walletClient } = useWalletClient();
//   const [tokenName, setTokenName] = useState('WebCoin');
//   const [tokenAmount, setTokenAmount] = useState('');
//   const [contractAddress, setContractAddress] = useState(
//     process.env.NEXT_PUBLIC_TOKEN_ADDRESS || '',
//   );
//   const [distributionMethod, setDistributionMethod] = useState('equal');
//   const [scheduleDate, setScheduleDate] = useState('');
//   const [gasOptimization, setGasOptimization] = useState(true);
//   const [batchSize, setBatchSize] = useState('100');
//   const [files, setFiles] = useState<RecipientFile[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [distributorAddress, setDistributorAddress] = useState('');
//   const [mintAmount, setMintAmount] = useState('');
//   const [mintStatus, setMintStatus] = useState('');
//   const [mintLoading, setMintLoading] = useState(false);

//   // Load files from local storage
//   useEffect(() => {
//     const storedFiles = localStorage.getItem('recipientFiles');
//     if (storedFiles) {
//       setFiles(JSON.parse(storedFiles));
//     }
//   }, []);

//   const handleMaxAmount = () => {
//     setTokenAmount('1000'); // Example max amount
//   };

//   // Modified handleMint function
//   const handleMint = async () => {
//     if (!window.ethereum) {
//       setError('Please install MetaMask or another wallet!');
//       return;
//     }
//     if (!isConnected) {
//       setError('Please connect your wallet!');
//       return;
//     }
//     if (!ethers.isAddress(distributorAddress)) {
//       setError('No valid distributor address available. Create an airdrop first.');
//       return;
//     }
//     if (!mintAmount || isNaN(Number(mintAmount)) || Number(mintAmount) <= 0) {
//       setError('Enter a valid mint amount.');
//       return;
//     }

//     try {
//       setMintLoading(true);
//       setError('');
//       setMintStatus('Minting tokens to distributor...');

//       // Initialize provider and signer with window.ethereum
//       const provider = new ethers.BrowserProvider(window.ethereum);
//       const signer = await provider.getSigner();

//       // Initialize token contract
//       const tokenContract = new ethers.Contract(contractAddress, WebCoinABI, signer);

//       // Parse mint amount
//       const amountToMint = ethers.parseUnits(mintAmount, 18); // Assuming 18 decimals

//       // Mint tokens
//       const mintTx = await tokenContract.mint(distributorAddress, amountToMint);
//       console.log('Mint transaction sent:', mintTx.hash);
//       await mintTx.wait();
//       console.log('Mint transaction confirmed');

//       setMintStatus(`Successfully minted ${mintAmount} WebCoin to ${distributorAddress}`);
//     } catch (mintErr) {
//       console.error('Minting error:', mintErr);
//       setError(`Minting failed: ${(mintErr as Error).message}`);
//       setMintStatus('');
//     } finally {
//       setMintLoading(false);
//     }
//   };

//   const handleDistribute = async () => {
//     if (!window.ethereum) {
//       setError('Please install MetaMask!');
//       return;
//     }
//     if (!isConnected) {
//       setError('Please connect your wallet!');
//       return;
//     }
//     if (files.length === 0) {
//       setError('No recipient files uploaded.');
//       return;
//     }

//     try {
//       setLoading(true);
//       setError('');
//       setDistributorAddress('');

//       // Connect to MetaMask
//       const provider = new ethers.BrowserProvider(window.ethereum);
//       const signer = await provider.getSigner();

//       // Ensure we have valid addresses
//       const factoryAddress = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
//       if (!factoryAddress || !ethers.isAddress(factoryAddress)) {
//         throw new Error('Invalid factory contract address');
//       }

//       if (!ethers.isAddress(contractAddress)) {
//         throw new Error('Invalid token contract address');
//       }

//       // Initialize contracts
//       const factoryContract = new ethers.Contract(factoryAddress, AirdropFactoryABI, signer);
//       const tokenContract = new ethers.Contract(contractAddress, WebCoinABI, signer);

//       // Combine recipients from all files
//       const allRecipients = files.flatMap((file) => file.recipients);
//       const totalRecipients = allRecipients.length;

//       // Regenerate merkle tree to ensure it's up to date
//       const { merkleRoot } = createMerkleTree(allRecipients);

//       // Parse amount properly
//       const dropAmount = ethers.parseUnits(tokenAmount || '100', 18); // Assuming 18 decimals
//       const totalDropAmount = dropAmount * BigInt(totalRecipients);

//       // Set start time
//       const startTime = scheduleDate
//         ? Math.floor(new Date(scheduleDate).getTime() / 1000)
//         : Math.floor(Date.now() / 1000);

//       console.log('Creating airdrop with:', {
//         tokenAddress: contractAddress,
//         merkleRoot,
//         dropAmount: dropAmount.toString(),
//         totalRecipients,
//         startTime,
//       });

//       // Approve token transfer
//       const approveTx = await tokenContract.approve(factoryAddress, totalDropAmount);
//       await approveTx.wait();
//       console.log('Approval complete');

//       // Create airdrop
//       const createTx = await factoryContract.createAirdrop(
//         contractAddress,
//         merkleRoot,
//         dropAmount,
//         totalRecipients,
//         startTime,
//       );
//       console.log('Transaction sent:', createTx.hash);
//       const receipt = await createTx.wait();
//       console.log('Transaction confirmed:', receipt);
//       // Extract distributor address from event
//       const event = receipt.logs
//         .filter((log: ethers.Log) => log && log.topics && log.topics.length > 0)
//         .map((log: ethers.Log): ethers.LogDescription | undefined => {
//           try {
//             // The parseLog method might return null
//             const result = factoryContract.interface.parseLog({
//               topics: log.topics,
//               data: log.data,
//             });
//             // Convert null to undefined to match our return type
//             return result || undefined;
//           } catch (e: unknown) {
//             console.log(e);
//             return undefined;
//           }
//         })
//         .find(
//           (e: ethers.LogDescription | undefined): e is ethers.LogDescription =>
//             e !== undefined && e.name === 'AirdropCreated',
//         );

//       if (event && event.args) {
//         const newDistributorAddress = event.args.distributorAddress;
//         setDistributorAddress(newDistributorAddress);
//         // Save last distributor address for claim page
//         localStorage.setItem('lastDistributorAddress', newDistributorAddress);
//       } else {
//         throw new Error('Failed to retrieve distributor address from transaction');
//       }
//     } catch (err) {
//       console.error('Distribution error:', err);
//       setError(`Error: ${err instanceof Error ? err.message : 'Unknown error occurred'}`);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <DashBoardLayout>
//       <div className='bg-#201726 text-purple-100 min-h-screen'>
//         <header className='border-b border-purple-500/20 p-4'>
//           <div className='container flex items-center justify-between'>
//             <div className='flex items-center gap-2'>
//               <Coins className='h-6 w-6' />
//               <span className='text-xl font-bold'>LaunchPad</span>
//             </div>
//           </div>
//         </header>

//         <main className='container py-8'>
//           <div className='mb-6 flex items-center'>
//             <Link href='/dashboard/airdrop-listing/upload'>
//               <Button
//                 variant='ghost'
//                 className='text-purple-100 hover:bg-purple-500/10 hover:text-purple-200'
//               >
//                 <ArrowLeft className='mr-2 h-4 w-4' />
//                 Back to Recipients
//               </Button>
//             </Link>
//             <h1 className='ml-4 text-2xl font-bold'>Distribute Airdrop</h1>
//           </div>

//           {error && (
//             <Alert className='mb-4 bg-red-500/10 border-red-500/20'>
//               <AlertDescription>{error}</AlertDescription>
//             </Alert>
//           )}

//           {distributorAddress && (
//             <Alert className='mb-4 bg-green-500/10 border-green-500/20'>
//               <AlertDescription>
//                 Airdrop created! Distributor Address: <code>{distributorAddress}</code>
//               </AlertDescription>
//             </Alert>
//           )}

//           {mintStatus && (
//             <Alert
//               className={`mb-4 ${
//                 mintStatus.includes('Failed')
//                   ? 'bg-red-500/10 border-red-500/20'
//                   : 'bg-blue-500/10 border-blue-500/20'
//               }`}
//             >
//               <AlertDescription>{mintStatus}</AlertDescription>
//             </Alert>
//           )}

//           <div className='grid gap-6 lg:grid-cols-3'>
//             <div className='lg:col-span-2'>
//               <Card className='bg-zinc-900/10 border-purple-500/20'>
//                 <CardHeader>
//                   <div className='flex items-center justify-between'>
//                     <div>
//                       <CardTitle>Create New Airdrop</CardTitle>
//                       <CardDescription>
//                         Configure your token distribution parameters
//                       </CardDescription>
//                     </div>
//                     <Coins className='h-8 w-8 text-purple-400' />
//                   </div>
//                 </CardHeader>
//                 <CardContent className='space-y-6'>
//                   <div className='space-y-4'>
//                     <div>
//                       <Label htmlFor='tokenName'>Token Name</Label>
//                       <Input
//                         id='tokenName'
//                         placeholder='Enter token name'
//                         value={tokenName}
//                         onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
//                           setTokenName(e.target.value)
//                         }
//                         className='mt-1.5 bg-purple-800/40 border-purple-500/20 focus:border-purple-500'
//                       />
//                     </div>

//                     <div>
//                       <Label htmlFor='tokenAmount'>Token Amount (per recipient)</Label>
//                       <div className='flex mt-1.5'>
//                         <Input
//                           id='tokenAmount'
//                           type='number'
//                           placeholder='0.0'
//                           value={tokenAmount}
//                           onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
//                             setTokenAmount(e.target.value)
//                           }
//                           className='bg-purple-800/40 border-purple-500/20 focus:border-purple-500'
//                         />
//                         <Button
//                           variant='outline'
//                           className='ml-2 border-purple-500 text-purple-100 hover:bg-purple-500/10'
//                           onClick={handleMaxAmount}
//                         >
//                           MAX
//                         </Button>
//                       </div>
//                     </div>

//                     <div>
//                       <Label htmlFor='contractAddress'>Token Contract Address</Label>
//                       <Input
//                         id='contractAddress'
//                         placeholder='0x...'
//                         value={contractAddress}
//                         onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
//                           setContractAddress(e.target.value)
//                         }
//                         className='mt-1.5 bg-purple-800/40 border-purple-500/20 focus:border-purple-500'
//                       />
//                     </div>
//                   </div>

//                   <Separator className='bg-purple-500/20' />

//                   <div>
//                     <Label className='mb-2 block'>Recipients</Label>
//                     <div className='flex flex-wrap gap-2'>
//                       {files.map((file) => (
//                         <Badge
//                           key={file.id}
//                           variant='outline'
//                           className='border-purple-500 text-purple-100 px-3 py-1'
//                         >
//                           {file.name} ({file.count} addresses)
//                         </Badge>
//                       ))}
//                       <Link href='/dashboard/airdrop-listing/upload'>
//                         <Badge
//                           variant='outline'
//                           className='border-purple-500/50 text-purple-100/70 px-3 py-1 cursor-pointer hover:border-purple-500 hover:text-purple-100'
//                         >
//                           + Add more
//                         </Badge>
//                       </Link>
//                     </div>
//                   </div>

//                   <div>
//                     <Label htmlFor='distributionMethod'>Distribution Method</Label>
//                     <Select value={distributionMethod} onValueChange={setDistributionMethod}>
//                       <SelectTrigger className='mt-1.5 bg-purple-800/40 border-purple-500/20 focus:border-purple-500'>
//                         <SelectValue placeholder='Select distribution method' />
//                       </SelectTrigger>
//                       <SelectContent className='bg-purple-800/40 border-purple-500/20'>
//                         <SelectItem value='equal'>Equal Split</SelectItem>
//                         <SelectItem value='custom'>Custom Amounts (from CSV)</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>

//                   <div>
//                     <Label htmlFor='scheduleDate'>Schedule</Label>
//                     <div className='flex mt-1.5'>
//                       <Input
//                         id='scheduleDate'
//                         type='date'
//                         value={scheduleDate}
//                         onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
//                           setScheduleDate(e.target.value)
//                         }
//                         className='bg-purple-800/40 border-purple-500/20 focus:border-purple-500'
//                       />
//                       <Button
//                         variant='outline'
//                         className='ml-2 border-purple-500 text-purple-100 hover:bg-purple-500/10'
//                       >
//                         <Calendar className='h-4 w-4' />
//                       </Button>
//                     </div>
//                   </div>

//                   <Separator className='bg-purple-500/20' />
//                   <div>
//                     <Label htmlFor='mintAmount'>Mint Tokens to Distributor</Label>
//                     <div className='space-y-4 mt-1.5'>
//                       <div>
//                         <Label htmlFor='mintRecipient'>Recipient (Distributor Address)</Label>
//                         <Input
//                           id='mintRecipient'
//                           value={distributorAddress || 'Create airdrop to set recipient'}
//                           readOnly
//                           className='mt-1.5 bg-purple-800/40 border-purple-500/20'
//                         />
//                       </div>
//                       <div>
//                         <Label htmlFor='mintAmount'>Mint Amount</Label>
//                         <Input
//                           id='mintAmount'
//                           type='number'
//                           placeholder='0.0'
//                           value={mintAmount}
//                           onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
//                             setMintAmount(e.target.value)
//                           }
//                           className='mt-1.5 bg-purple-800/40 border-purple-500/20 focus:border-purple-500'
//                         />
//                       </div>
//                       <Button
//                         className='w-full bg-purple-500 hover:bg-purple-600 text-black'
//                         onClick={handleMint}
//                         disabled={!distributorAddress || !mintAmount || mintLoading || !isConnected}
//                       >
//                         {mintLoading ? 'Minting...' : 'Mint Tokens'}
//                       </Button>
//                     </div>
//                   </div>
//                 </CardContent>
//               </Card>
//             </div>

//             <div>
//               <Card className='bg-zinc-900/10 border-purple-500/20'>
//                 <CardHeader>
//                   <CardTitle>Advanced Settings</CardTitle>
//                 </CardHeader>
//                 <CardContent className='space-y-6'>
//                   <div className='flex items-center justify-between'>
//                     <div className='flex items-center space-x-2'>
//                       <Label htmlFor='gasOptimization'>Gas Optimization</Label>
//                       <TooltipProvider>
//                         <Tooltip>
//                           <TooltipTrigger>
//                             <Info className='h-4 w-4 text-purple-100/70' />
//                           </TooltipTrigger>
//                           <TooltipContent className='bg-purple-800/40 border-purple-500/20'>
//                             <p>Optimize gas usage for large distributions</p>
//                           </TooltipContent>
//                         </Tooltip>
//                       </TooltipProvider>
//                     </div>
//                     <Switch
//                       id='gasOptimization'
//                       checked={gasOptimization}
//                       onCheckedChange={setGasOptimization}
//                       className='data-[state=checked]:bg-purple-500'
//                     />
//                   </div>

//                   <div>
//                     <Label htmlFor='batchSize'>Batch Size</Label>
//                     <Input
//                       id='batchSize'
//                       type='number'
//                       value={batchSize}
//                       onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
//                         setBatchSize(e.target.value)
//                       }
//                       className='mt-1.5 bg-purple-800/40 border-purple-500/20 focus:border-purple-500'
//                     />
//                   </div>

//                   <Separator className='bg-purple-500/20' />

//                   <div>
//                     <div className='flex items-center justify-between mb-2'>
//                       <Label>Estimated Gas:</Label>
//                       <span className='font-mono'>0.05 ETH</span>
//                     </div>
//                     <div className='flex items-center justify-between mb-2'>
//                       <Label>Total Recipients:</Label>
//                       <span>{files.reduce((sum, file) => sum + file.count, 0)}</span>
//                     </div>
//                     <div className='flex items-center justify-between'>
//                       <Label>Distribution Type:</Label>
//                       <Badge variant='outline' className='border-purple-500/50 text-purple-100'>
//                         {distributionMethod === 'equal' ? 'Equal Split' : 'Custom'}
//                       </Badge>
//                     </div>
//                   </div>
//                 </CardContent>
//                 <CardFooter>
//                   <Button
//                     className='w-full bg-purple-500 hover:bg-purple-600 text-black'
//                     onClick={handleDistribute}
//                     disabled={
//                       !tokenName ||
//                       !tokenAmount ||
//                       !contractAddress ||
//                       files.length === 0 ||
//                       loading ||
//                       !isConnected
//                     }
//                   >
//                     {loading ? 'Distributing...' : 'Distribute Airdrop'}
//                   </Button>
//                 </CardFooter>
//               </Card>
//             </div>
//           </div>
//         </main>
//       </div>
//     </DashBoardLayout>
//   );
// }
