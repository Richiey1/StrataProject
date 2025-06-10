'use client';

import { useState, useEffect } from 'react';
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
import { Coins } from 'lucide-react';
import DashBoardLayout from '../../DashboardLayout';
import MerkleDistributorABI from '../../../../../lib/contracts/MerkleDistributor.json';

// Add MerkleDistributor ABI with merkleRoot function
const ExtendedMerkleDistributorABI = [
  ...MerkleDistributorABI,
  {
    inputs: [],
    name: 'merkleRoot',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
];

// Background Shapes Component (copied from upload page)
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

  // Add fetchDistributorDetails function
  const fetchDistributorDetails = async (contractAddress: string) => {
    if (!ethers.isAddress(contractAddress)) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, ExtendedMerkleDistributorABI, provider);

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

  // Add handleAddressChange function
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

      const files = JSON.parse(storedFiles);
      if (!files.length)
        throw new Error('No recipient data found. Please upload recipients CSV first.');

      // Find user's proof in saved files
      let userProof = null;
      const userAddress = address.toLowerCase();

      // Search through each file for the user's address and proof
      for (const file of files) {
        // Check if proofs exist directly in the file structure
        if (file.proofs && file.proofs[userAddress]) {
          userProof = file.proofs[userAddress];
          break;
        }

        // Check if we need to search through recipients
        if (file.recipients) {
          const recipient = file.recipients.find(
            (r: { address: string; proof: string[] }) =>
              r.address && r.address.toLowerCase() === userAddress && r.proof,
          );

          if (recipient && recipient.proof) {
            userProof = recipient.proof;
            break;
          }
        }
      }

      if (!userProof) throw new Error('Your address is not whitelisted for this airdrop.');

      // Initialize contract
      setStatusMessage('Connecting to contract...');
      const contract = new ethers.Contract(distributorAddress, MerkleDistributorABI, signer);

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

      // ✅ Check token balance of contract
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

      const dropAmount = await contract.dropAmount();
      console.log('🎯 Raw drop amount:', dropAmount.toString());
      console.log('🎯 Formatted drop amount:', ethers.formatUnits(dropAmount, 18));

      // 🔐 Compare and throw error if not enough tokens
      if (contractBalance < dropAmount) {
        throw new Error("Contract doesn't have enough tokens to distribute.");
      }

      // Execute claim transaction
      setStatusMessage('Sending claim transaction...');
      console.log('User Proof:', userProof);

      // Estimate gas to catch potential errors before sending
      try {
        await contract.claim.estimateGas(userProof);
      } catch (estimateErr) {
        console.error('Gas estimation failed:', estimateErr);
        throw new Error('Transaction is likely to fail. Your proof may be invalid.');
      }

      // Send transaction
      const tx = await contract.claim(userProof, {
        gasLimit: 300000, // Set explicit gas limit as fallback
      });

      setStatusMessage('Waiting for transaction confirmation...');
      await tx.wait();

      localStorage.setItem('lastDistributorAddress', distributorAddress);
      setSuccess('Airdrop claimed successfully! Transaction: ' + tx.hash);
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
            <div className="mb-8 flex items-center">
              <h1 className="ml-4 text-3xl font-bold text-white">Claim Airdrop</h1>
            </div>

            <div className="max-w-2xl mx-auto">
              <Card className="bg-[#2A1F36]/80 border-purple-500/20 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Claim Your Tokens</CardTitle>
                  <CardDescription className="text-gray-300">
                    Enter your airdrop distributor address and claim
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="distributorAddress" className="text-gray-300">Distributor Address</Label>
                    <Input
                      id="distributorAddress"
                      placeholder="0x..."
                      value={distributorAddress}
                      onChange={handleAddressChange}
                      className="mt-1.5 bg-purple-800/40 border-purple-500/20 focus:border-purple-500 text-white placeholder:text-gray-400"
                    />
                  </div>
                  {/* Add airdrop details display */}
                  {airdropInfo && (
                    <div className="space-y-2 text-gray-300">
                      <p>
                        <strong className="text-white">Token Address:</strong> {airdropInfo.tokenAddress}
                      </p>
                      <p>
                        <strong className="text-white">Drop Amount:</strong> {airdropInfo.dropAmount} tokens
                      </p>
                      <p>
                        <strong className="text-white">Start Time:</strong> {airdropInfo.startTime}
                      </p>
                      <p>
                        <strong className="text-white">Merkle Root:</strong> {airdropInfo.merkleRoot}
                      </p>
                    </div>
                  )}
                  {statusMessage && (
                    <Alert className="bg-blue-500/10 border-blue-500/20">
                      <AlertDescription className="text-blue-200">{statusMessage}</AlertDescription>
                    </Alert>
                  )}
                  {error && (
                    <Alert className="bg-red-500/10 border-red-500/20">
                      <AlertDescription className="text-red-200">{error}</AlertDescription>
                    </Alert>
                  )}
                  {success && (
                    <Alert className="bg-green-500/10 border-green-500/20">
                      <AlertDescription className="text-green-200">{success}</AlertDescription>
                    </Alert>
                  )}
                  <Button
                    className="w-full bg-purple-500 hover:bg-purple-600 text-black"
                    onClick={handleClaim}
                    disabled={!distributorAddress || loading || !isConnected}
                  >
                    {loading ? 'Claiming...' : 'Claim Airdrop'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </DashBoardLayout>
  );
}