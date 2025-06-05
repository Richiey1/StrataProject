'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
import { ArrowRight, Coins } from 'lucide-react';
import DashBoardLayout from '../../token-creator/DashboardLayout';
import StrataForgeFactoryABI from '../../../components/ABIs/StrataForgeFactoryABI.json';
import { useWallet } from '../../../../contexts/WalletContext';

// Constants
const FACTORY_CONTRACT_ADDRESS = '0x59F42c3eEcf829b34d8Ca846Dfc83D3cDC105C3F' as const;
const BASE_SEPOLIA_CHAIN_ID = 84532;

// Background Shapes Component
const BackgroundShapes = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-20 left-10 w-32 h-32 border-2 border-purple-500/20 rounded-full animate-pulse"></div>
    <div className="absolute top-40 right-20 w-24 h-24 border-2 border-blue-500/20 rotate-45 animate-pulse delay-200"></div>
    <div className="absolute bottom-32 left-20 w-40 h-40 border-2 border-purple-400/15 rounded-2xl rotate-12 animate-pulse delay-400"></div>
    <div className="absolute top-1/3 left-1/4 w-16 h-16 border-2 border-cyan-500/20 rotate-45 animate-pulse delay-600"></div>
    <div className="absolute bottom-1/4 right-1/3 w-28 h-28 border-2 border-purple-300/15 rounded-full animate-pulse delay-800"></div>
  </div>
);

export default function ClaimAirdrop() {
  const { address, isConnected } = useWallet();
  const [airdropId, setAirdropId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [chainId, setChainId] = useState<number | null>(null);

  // Check network
  useEffect(() => {
    const checkNetwork = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
          setChainId(Number(network.chainId));
        } catch {
          setError('Failed to detect network');
        }
      }
    };
    checkNetwork();
  }, []);

  // Load last airdrop ID
  useEffect(() => {
    const lastAirdropId = localStorage.getItem('lastAirdropId');
    if (lastAirdropId) {
      setAirdropId(lastAirdropId);
    }
  }, []);

  // Validate airdrop ID
  const validateAirdropId = (id: string): string | null => {
    if (id === '') return 'Airdrop ID cannot be empty';
    if (isNaN(Number(id)) || Number(id) < 0) return 'Invalid airdrop ID format';
    return null;
  };

  const handleClaim = async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask or another wallet provider!');
      return;
    }
    if (!isConnected || !address) {
      setError('Please connect your wallet!');
      return;
    }
    if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
      setError('Please switch to Base Sepolia network');
      return;
    }

    const idError = validateAirdropId(airdropId);
    if (idError) {
      setError(idError);
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Initialize provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Initialize factory contract
      const factoryContract = new ethers.Contract(
        FACTORY_CONTRACT_ADDRESS,
        StrataForgeFactoryABI,
        provider,
      );

      // Fetch airdrop details
      const airdropInfo = await factoryContract.airdrops(BigInt(airdropId));
      if (!airdropInfo.distributorAddress || airdropInfo.distributorAddress === ethers.ZeroAddress) {
        throw new Error('Airdrop not found');
      }

      // Initialize distributor contract
      const distributorContract = new ethers.Contract(
        airdropInfo.distributorAddress,
        StrataForgeFactoryABI,
        signer,
      );

      // Check if already claimed
      const claimed = await distributorContract.hasClaimed(address);
      if (claimed) {
        throw new Error('You have already claimed this airdrop.');
      }

      // Check if airdrop has started
      const startTime = await distributorContract.startTime();
      const now = Math.floor(Date.now() / 1000);
      if (now < Number(startTime)) {
        const startDate = new Date(Number(startTime) * 1000);
        throw new Error(`Airdrop not started yet. Starts at ${startDate.toLocaleString()}`);
      }

      // Check if paused
      const isPaused = await distributorContract.paused();
      if (isPaused) {
        throw new Error('Airdrop is currently paused.');
      }

      // Get drop amount
      const dropAmount = airdropInfo.dropAmount;

      // Send claim transaction
      const tx = await distributorContract.claim(address, dropAmount, [], {
        gasLimit: 300000,
      });
      await tx.wait();

      localStorage.setItem('lastAirdropId', airdropId);
      setSuccess('Airdrop claimed successfully!');
    } catch (err) {
      console.error('Claim error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashBoardLayout>
      <div className="relative min-h-screen bg-gradient-to-br from-[#1A0D23] to-[#2A1F36] text-purple-100">
        <BackgroundShapes />
        <header className="border-b border-purple-500/20 p-4 relative z-10">
          <div className="container flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-6 w-6 text-purple-400" />
              <span className="text-xl font-bold text-white">StrataForge LaunchPad</span>
            </div>
          </div>
        </header>

        <main className="container py-8 relative z-10">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Claim Airdrop</h1>
            <Link href="/dashboard/token-creator/airdrop-listing/claim">
              <Button
                variant="ghost"
                className="text-purple-100 hover:bg-purple-500/10 hover:text-purple-200"
              >
                View Airdrop Listings <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="max-w-md mx-auto">
            <Card className="bg-[#2A1F36]/80 border-purple-500/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Claim Your Tokens</CardTitle>
                <CardDescription className="text-purple-100/70">
                  Enter the airdrop ID to claim your tokens
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="airdropId" className="text-gray-300">
                    Airdrop ID
                  </Label>
                  <Input
                    id="airdropId"
                    placeholder="Enter airdrop ID"
                    value={airdropId}
                    onChange={(e) => setAirdropId(e.target.value)}
                    className="mt-1.5 bg-[#1E1425] border-gray-800 text-white focus:border-purple-500"
                  />
                </div>
                {error && (
                  <Alert className="bg-red-500/10 border-red-500/20">
                    <AlertDescription className="text-red-300">{error}</AlertDescription>
                  </Alert>
                )}
                {success && (
                  <Alert className="bg-green-500/10 border-green-500/20">
                    <AlertDescription className="text-green-300">{success}</AlertDescription>
                  </Alert>
                )}
                <Button
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-600 text-white hover:opacity-90"
                  onClick={handleClaim}
                  disabled={loading || !isConnected || !airdropId || chainId !== BASE_SEPOLIA_CHAIN_ID}
                >
                  {loading ? 'Claiming...' : 'Claim Airdrop'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </DashBoardLayout>
  );
}