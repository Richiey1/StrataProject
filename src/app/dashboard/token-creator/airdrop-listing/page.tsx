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
import { Alert, AlertDescription } from '../../../../../components/ui/alert';
import { ArrowRight, Coins } from 'lucide-react';
import DashBoardLayout from '../../token-creator/DashboardLayout';
import StrataForgeFactoryABI from '../../../components/ABIs/StrataForgeFactoryABI.json';
import { useWallet } from '../../../../contexts/WalletContext';
import DISTRIBUTOR_ABI from '../../../../lib/contracts/DistributorABI.json';
import { Label } from '../../../../../components/ui/label';
import { Input } from '../../../../../components/ui/input';

// Constants
const FACTORY_CONTRACT_ADDRESS = '0x3A1aCc78cc5ec3a320236f470319f60727De6Ed4';
const BASE_SEPOLIA_CHAIN_ID = 84532;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Recipient type
type RecipientFile = {
  id: string;
  name: string;
  count: number;
  merkleRoot: string;
  distributorAddress?: string;
  recipients: { address: string; amount: string; proof?: string[] }[];
  proofs: { [address: string]: string[] };
};

// ERC20 Minimal ABI
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
];

const BackgroundShapes = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-20 left-10 w-32 h-32 border-2 border-purple-500/20 rounded-full animate-pulse" />
    <div className="absolute top-40 right-20 w-24 h-24 border-2 border-blue-500/20 rotate-45 animate-pulse delay-200" />
    <div className="absolute bottom-32 left-20 w-40 h-40 border-2 border-purple-400/15 rounded-2xl rotate-12 animate-pulse delay-400" />
    <div className="absolute top-1/3 left-1/4 w-16 h-16 border-2 border-cyan-500/20 rotate-45 animate-pulse delay-600" />
    <div className="absolute bottom-1/4 right-1/3 w-28 h-28 border-2 border-purple-300/15 rounded-full animate-pulse delay-800" />
  </div>
);

export default function ClaimAirdrop() {
  const { address, isConnected } = useWallet();
  const [airdropId, setAirdropId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [chainId, setChainId] = useState<number | null>(null);

  useEffect(() => {
    const checkNetwork = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        setChainId(Number(network.chainId));
      } catch {
        setError('Failed to detect network');
      }
    };
    checkNetwork();
  }, []);

  useEffect(() => {
    const id = localStorage.getItem('lastAirdropId');
    if (id) setAirdropId(id);
  }, []);

  const validateAirdropId = (id: string): string | null => {
    if (!id) return 'Airdrop ID cannot be empty';
    if (isNaN(Number(id)) || Number(id) < 0) return 'Invalid airdrop ID format';
    return null;
  };

  const handleClaim = async () => {
    if (!window.ethereum) return setError('Please install MetaMask');
    if (!isConnected || !address) return setError('Connect your wallet');
    if (chainId !== BASE_SEPOLIA_CHAIN_ID) return setError('Switch to Base Sepolia');

    const idError = validateAirdropId(airdropId);
    if (idError) return setError(idError);

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const factory = new ethers.Contract(
        FACTORY_CONTRACT_ADDRESS,
        StrataForgeFactoryABI,
        provider
      );

      const airdropInfo = await factory.airdrops(BigInt(airdropId));
      if (!airdropInfo || airdropInfo.distributor === ZERO_ADDRESS)
        throw new Error('Airdrop not found');

      const distributor = new ethers.Contract(airdropInfo.distributor, DISTRIBUTOR_ABI, signer);
      const tokenType = await distributor.tokenType();
      if (Number(tokenType) !== 0) throw new Error('Only ERC20 airdrops supported here.');

      const hasClaimed = await distributor.hasClaimed(address);
      if (hasClaimed) throw new Error('Already claimed.');

      const startTime = Number(await distributor.startTime());
      const now = Math.floor(Date.now() / 1000);
      if (now < startTime)
        throw new Error(`Airdrop not started. Starts at ${new Date(startTime * 1000).toLocaleString()}`);

      const stored = localStorage.getItem('recipientFiles');
      if (!stored) throw new Error('No recipient data found.');

      const files: RecipientFile[] = JSON.parse(stored);
      const userAddr = address.toLowerCase();
      let found = false;
      let proof: string[] = [];
      let userAmount = '0';

      for (const file of files) {
        if (file.merkleRoot === airdropInfo.merkleRoot && file.proofs?.[userAddr]) {
          proof = file.proofs[userAddr];
          const recipient = file.recipients.find(r => r.address.toLowerCase() === userAddr);
          if (recipient) userAmount = recipient.amount;
          found = true;
          break;
        }
      }

      if (!found) throw new Error('You are not whitelisted for this airdrop.');

      const tokenAddress = await distributor.token();
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const decimals = await token.decimals();
      const dropAmount = await distributor.dropAmount();
      const dropFormatted = ethers.formatUnits(dropAmount, decimals);
      const expectedAmount = ethers.parseUnits(userAmount, decimals);
      const balance = await token.balanceOf(airdropInfo.distributor);

      if (userAmount !== dropFormatted)
        throw new Error(`Your amount (${userAmount}) ≠ drop amount (${dropFormatted})`);

      if (balance < expectedAmount)
        throw new Error('Not enough tokens in distributor contract');

      // Gas estimation removed
      const tx = await distributor.claim(proof);
      await tx.wait();

      localStorage.setItem('lastAirdropId', airdropId);
      setSuccess(`Success! You received ${userAmount} tokens. Tx: ${tx.hash}`);
    } catch (err: unknown) {
      let msg = 'Unexpected error';
      if (
        err &&
        typeof err === 'object' &&
        'message' in err &&
        typeof (err as { message?: string }).message === 'string'
      ) {
        msg = (err as { message: string }).message;
      }
      if (msg.includes('InvalidProof')) setError('Invalid proof. Not whitelisted.');
      else if (msg.includes('AlreadyClaimed')) setError('You already claimed this.');
      else if (msg.includes('AirdropNotStarted')) setError('Airdrop hasn’t started.');
      else if (msg.includes('TransferFailed')) setError('Token transfer failed.');
      else setError(msg);
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
              <Button variant="ghost" className="text-purple-100 hover:bg-purple-500/10">
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
                    value={airdropId}
                    onChange={(e) => setAirdropId(e.target.value)}
                    className="mt-1.5 bg-[#1E1425] border-gray-800 text-white"
                    placeholder="Enter airdrop ID"
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
                  onClick={handleClaim}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={loading}
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