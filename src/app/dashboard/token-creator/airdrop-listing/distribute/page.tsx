'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ethers, Log, LogDescription } from 'ethers';
import { Button } from '../../../../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../../../../components/ui/card';
import { Input } from '../../../../../../components/ui/input';
import { Label } from '../../../../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../../../components/ui/select';
import { Switch } from '../../../../../../components/ui/switch';
import { Alert, AlertDescription } from '../../../../../../components/ui/alert';
import { Coins, Calendar, Info } from 'lucide-react';
import { Badge } from '../../../../../../components/ui/badge';
import { Separator } from '../../../../../../components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../../../../components/ui/tooltip';
import DashBoardLayout from '../../DashboardLayout';
import StrataForgeFactoryABI from '../../../../../app/components/ABIs/StrataForgeFactoryABI.json';
import StrataForgeERC20ImplementationABI from '../../../../components/ABIs/StrataForgeERC20ImplementationABI.json';
import { createMerkleTree, Recipient } from '../../../../../lib/merkle';

// Background Shapes Component (copied from airdrop-listing/page.tsx)
const BackgroundShapes = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-20 left-10 w-32 h-32 border-2 border-purple-500/20 rounded-full animate-pulse"></div>
    <div className="absolute top-40 right-20 w-24 h-24 border-2 border-blue-500/20 rotate-45 animate-pulse delay-200"></div>
    <div className="absolute bottom-32 left-20 w-40 h-40 border-2 border-purple-400/15 rounded-2xl rotate-12 animate-pulse delay-400"></div>
    <div className="absolute top-1/3 left-1/4 w-16 h-16 border-2 border-cyan-500/20 rotate-45 animate-pulse delay-600"></div>
    <div className="absolute bottom-1/4 right-1/3 w-28 h-28 border-2 border-purple-300/15 rounded-full animate-pulse delay-800"></div>
    <div className="absolute top-10 right-1/3 w-64 h-64 bg-gradient-to-br from-purple-500/15 to-transparent rounded-full blur-xl animate-pulse delay-1000"></div>
    <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-gradient-to-tr from-blue-500/15 to-transparent rounded-full blur-xl animate-pulse delay-1200"></div>
    <div className="absolute top-1/2 right-10 w-48 h-48 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-full blur-xl animate-pulse delay-1400"></div>
  </div>
);

const FACTORY_CONTRACT_ADDRESS = '0x59F42c3eEcf829b34d8Ca846Dfc83D3cDC105C3F' as const;

type RecipientFile = {
  id: string;
  name: string;
  count: number;
  merkleRoot: string;
  recipients: Recipient[];
  proofs: { [address: string]: string[] };
};

export default function DistributePage() {
  const { isConnected } = useAccount();
  const [tokenName, setTokenName] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [contractAddress, setContractAddress] = useState('');
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

  // Load files from local storage
  useEffect(() => {
    const storedFiles = localStorage.getItem('recipientFiles');
    if (storedFiles) {
      setFiles(JSON.parse(storedFiles));
    }
  }, []);

  const handleMaxAmount = () => {
    setTokenAmount('1000'); // Example max amount
  };

  const handleMint = async () => {
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

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const tokenContract = new ethers.Contract(
        contractAddress,
        StrataForgeERC20ImplementationABI,
        signer,
      );

      const amountToMint = ethers.parseUnits(mintAmount, 18);

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

    try {
      setLoading(true);
      setError('');
      setDistributorAddress('');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      if (!ethers.isAddress(contractAddress)) {
        throw new Error('Invalid token contract address');
      }

      const factoryContract = new ethers.Contract(
        FACTORY_CONTRACT_ADDRESS,
        StrataForgeFactoryABI,
        signer,
      );
      const tokenContract = new ethers.Contract(
        contractAddress,
        StrataForgeERC20ImplementationABI,
        signer,
      );

      const allRecipients = files.flatMap((file) => file.recipients);
      const totalRecipients = allRecipients.length;

      const { merkleRoot } = createMerkleTree(allRecipients);

      const dropAmount = ethers.parseUnits(tokenAmount || '100', 18);
      const totalDropAmount = dropAmount * BigInt(totalRecipients);

      const startTime = scheduleDate
        ? Math.floor(new Date(scheduleDate).getTime() / 1000)
        : Math.floor(Date.now() / 1000);

      console.log('Creating airdrop with:', {
        tokenAddress: contractAddress,
        merkleRoot,
        dropAmount: dropAmount.toString(),
        totalRecipients,
        startTime,
      });

      const approveTx = await tokenContract.approve(FACTORY_CONTRACT_ADDRESS, totalDropAmount);
      await approveTx.wait();
      console.log('Approval complete');

      const createTx = await factoryContract.createAirdrop(
        contractAddress,
        merkleRoot,
        dropAmount,
        totalRecipients,
        startTime,
      );
      console.log('Transaction sent:', createTx.hash);
      const receipt = await createTx.wait();
      console.log('Transaction confirmed:', receipt);

      const event = receipt.logs
        .map((log: Log) => {
          try {
            return factoryContract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: LogDescription | null) => e && e.name === 'AirdropCreated');

      if (event && event.args) {
        const newDistributorAddress = event.args.distributorAddress;
        setDistributorAddress(newDistributorAddress);
        localStorage.setItem('lastDistributorAddress', newDistributorAddress);
      } else {
        throw new Error('Failed to retrieve distributor address from transaction');
      }
    } catch (err) {
      console.error('Distribution error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      if (errorMessage.includes('InvalidTokenOrigin')) {
        setError('Selected token was not created on this platform.');
      } else if (errorMessage.includes('InvalidTokenType')) {
        setError('Premium subscription required to create airdrop.');
      } else if (errorMessage.includes('InsufficientTokenBalance')) {
        setError('Not enough tokens in your wallet.');
      } else {
        setError(`Error: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashBoardLayout>
      <div className="min-h-screen bg-gradient-to-br from-[#1A0D23] to-[#2A1F36]">
        <BackgroundShapes />
        <header className="border-b border-purple-500/20 p-4">
          <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2">
              <Coins className="h-6 w-6 text-purple-400" />
              <span className="text-xl font-bold text-white">LaunchPad</span>
            </div>
          </div>
        </header>

        <main className="py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center mb-8">
              <Link href="/dashboard/token-creator/airdrop-listing/upload">
                <Button
                  variant="ghost"
                  className="text-white hover:bg-purple-500/10 hover:text-purple-200 mr-4"
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  Back to Upload Recipients
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-white">Distribute Airdrop</h1>
            </div>

            {error && (
              <Alert className="mb-4 bg-red-500/10 border-red-500/20">
                <AlertDescription className="text-white">{error}</AlertDescription>
              </Alert>
            )}

            {distributorAddress && (
              <Alert className="mb-4 bg-green-500/10 border-green-500/20">
                <AlertDescription className="text-white">
                  Airdrop created! Distributor Address: <code>{distributorAddress}</code>
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
                <AlertDescription className="text-white">{mintStatus}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Card className="bg-[#2A1F36]/80 border-purple-500/20 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white">Create New Airdrop</CardTitle>
                        <CardDescription className="text-gray-300">
                          Configure your token distribution parameters
                        </CardDescription>
                      </div>
                      <Coins className="h-8 w-8 text-purple-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="tokenName" className="text-white">
                          Token Name
                        </Label>
                        <Input
                          id="tokenName"
                          placeholder="Enter token name"
                          value={tokenName}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setTokenName(e.target.value)
                          }
                          className="mt-1.5 bg-purple-800/40 border-purple-500/20 focus:border-purple-500 text-white"
                        />
                      </div>

                      <div>
                        <Label htmlFor="tokenAmount" className="text-white">
                          Token Amount (per recipient)
                        </Label>
                        <div className="flex mt-1.5">
                          <Input
                            id="tokenAmount"
                            type="number"
                            placeholder="0.0"
                            value={tokenAmount}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setTokenAmount(e.target.value)
                            }
                            className="bg-purple-800/40 border-purple-500/20 focus:border-purple-500 text-white"
                          />
                          <Button
                            variant="outline"
                            className="ml-2 border-purple-500 text-white hover:bg-purple-500/10"
                            onClick={handleMaxAmount}
                          >
                            MAX
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="contractAddress" className="text-white">
                          Token Contract Address
                        </Label>
                        <Input
                          id="contractAddress"
                          placeholder="0x..."
                          value={contractAddress}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setContractAddress(e.target.value)
                          }
                          className="mt-1.5 bg-purple-800/40 border-purple-500/20 focus:border-purple-500 text-white"
                        />
                      </div>
                    </div>

                    <Separator className="bg-purple-500/20" />

                    <div>
                      <Label className="mb-2 block text-white">Recipients</Label>
                      <div className="flex flex-wrap gap-2">
                        {files.map((file) => (
                          <Badge
                            key={file.id}
                            variant="outline"
                            className="border-purple-500 text-white px-3 py-1"
                          >
                            {file.name} ({file.count} addresses)
                          </Badge>
                        ))}
                        <Link href="/dashboard/token-creator/airdrop-listing/upload">
                          <Badge
                            variant="outline"
                            className="border-purple-500/50 text-gray-300 px-3 py-1 cursor-pointer hover:border-purple-500 hover:text-white"
                          >
                            + Add more
                          </Badge>
                        </Link>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="distributionMethod" className="text-white">
                        Distribution Method
                      </Label>
                      <Select value={distributionMethod} onValueChange={setDistributionMethod}>
                        <SelectTrigger className="mt-1.5 bg-purple-800/40 border-purple-500/20 focus:border-purple-500 text-white">
                          <SelectValue placeholder="Select distribution method" />
                        </SelectTrigger>
                        <SelectContent className="bg-purple-800/40 border-purple-500/20 text-white">
                          <SelectItem value="equal">Equal Split</SelectItem>
                          <SelectItem value="custom">Custom Amounts (from CSV)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="scheduleDate" className="text-white">
                        Schedule
                      </Label>
                      <div className="flex mt-1.5">
                        <Input
                          id="scheduleDate"
                          type="date"
                          value={scheduleDate}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setScheduleDate(e.target.value)
                          }
                          className="bg-purple-800/40 border-purple-500/20 focus:border-purple-500 text-white"
                        />
                        <Button
                          variant="outline"
                          className="ml-2 border-purple-500 text-white hover:bg-purple-500/10"
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <Separator className="bg-purple-500/20" />
                    <div>
                      <Label htmlFor="mintAmount" className="text-white">
                        Mint Tokens to Distributor
                      </Label>
                      <div className="space-y-4 mt-1.5">
                        <div>
                          <Label htmlFor="mintRecipient" className="text-white">
                            Recipient (Distributor Address)
                          </Label>
                          <Input
                            id="mintRecipient"
                            value={distributorAddress || 'Create airdrop to set recipient'}
                            readOnly
                            className="mt-1.5 bg-purple-800/40 border-purple-500/20 text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="mintAmount" className="text-white">
                            Mint Amount
                          </Label>
                          <Input
                            id="mintAmount"
                            type="number"
                            placeholder="0.0"
                            value={mintAmount}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setMintAmount(e.target.value)
                            }
                            className="mt-1.5 bg-purple-800/40 border-purple-500/20 focus:border-purple-500 text-white"
                          />
                        </div>
                        <Button
                          className="w-full bg-purple-500 hover:bg-purple-600 text-black"
                          onClick={handleMint}
                          disabled={!distributorAddress || !mintAmount || mintLoading || !isConnected}
                        >
                          {mintLoading ? 'Minting...' : 'Mint Tokens'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card className="bg-[#2A1F36]/80 border-purple-500/20 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Advanced Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="gasOptimization" className="text-white">
                          Gas Optimization
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-gray-300" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-purple-800/40 border-purple-500/20 text-white">
                              <p>Optimize gas usage for large distributions</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Switch
                        id="gasOptimization"
                        checked={gasOptimization}
                        onCheckedChange={setGasOptimization}
                        className="data-[state=checked]:bg-purple-500"
                      />
                    </div>

                    <div>
                      <Label htmlFor="batchSize" className="text-white">
                        Batch Size
                      </Label>
                      <Input
                        id="batchSize"
                        type="number"
                        value={batchSize}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setBatchSize(e.target.value)
                        }
                        className="mt-1.5 bg-purple-800/40 border-purple-500/20 focus:border-purple-500 text-white"
                      />
                    </div>

                    <Separator className="bg-purple-500/20" />

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-white">Estimated Gas:</Label>
                        <span className="font-mono text-white">0.05 ETH</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-white">Total Recipients:</Label>
                        <span className="text-white">
                          {files.reduce((sum, file) => sum + file.count, 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-white">Distribution Type:</Label>
                        <Badge variant="outline" className="border-purple-500/50 text-white">
                          {distributionMethod === 'equal' ? 'Equal Split' : 'Custom'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full bg-purple-500 hover:bg-purple-600 text-black"
                      onClick={handleDistribute}
                      disabled={
                        !tokenName ||
                        !tokenAmount ||
                        !contractAddress ||
                        files.length === 0 ||
                        loading ||
                        !isConnected
                      }
                    >
                      {loading ? 'Distributing...' : 'Distribute Airdrop'}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </DashBoardLayout>
  );
}