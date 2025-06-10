'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '../../../../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../../../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../../../components/ui/table';
import { Upload, FileText, Trash2, Plus, Coins, ArrowLeft } from 'lucide-react';
import { Badge } from '../../../../../../components/ui/badge';
import { ScrollArea } from '../../../../../../components/ui/scroll-area';
import { Alert, AlertDescription } from '../../../../../../components/ui/alert';
import { Input } from '../../../../../../components/ui/input';
import { Label } from '../../../../../../components/ui/label';
import DashBoardLayout from '../../DashboardLayout';
import { parseCSV, createMerkleTree, Recipient } from '../../../../../lib/merkle';
import { ethers } from 'ethers';

type RecipientFile = {
  id: string;
  name: string;
  size: string;
  count: number;
  date: string;
  merkleRoot: string;
  distributorAddress?: string;
  recipients: Recipient[];
  proofs: { [address: string]: string[] };
};

const BASE_SEPOLIA_CHAIN_ID = 84532;

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
] as const;

export default function UploadPage() {
  const [files, setFiles] = useState<RecipientFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [tokenAddress, setTokenAddress] = useState<string>('');
  const [tokenDetails, setTokenDetails] = useState<{
    name: string;
    symbol: string;
    decimals: number;
  } | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check network
  useEffect(() => {
    const checkNetwork = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
          const currentChainId = Number(network.chainId);
          setChainId(currentChainId);
          if (currentChainId !== BASE_SEPOLIA_CHAIN_ID) {
            setError('Please switch to Base Sepolia network.');
          } else {
            setError('');
          }
        } catch (err) {
          console.error('Network check failed:', err);
          setError('Failed to detect network. Ensure MetaMask is connected.');
        }
      } else {
        setError('Please install MetaMask or another wallet provider.');
      }
    };
    checkNetwork();
  }, []);

  // Fetch token details
  useEffect(() => {
    const fetchTokenDetails = async () => {
      if (tokenAddress && ethers.isAddress(tokenAddress)) {
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
      } else if (tokenAddress) {
        setError('Please enter a valid Ethereum address.');
        setTokenDetails(null);
      } else {
        setTokenDetails(null);
      }
    };

    if (chainId === BASE_SEPOLIA_CHAIN_ID) {
      fetchTokenDetails();
    }
  }, [tokenAddress, chainId]);

  // Load stored recipient files
  useEffect(() => {
    const storedFiles = localStorage.getItem('recipientFiles');
    if (storedFiles) {
      try {
        setFiles(JSON.parse(storedFiles));
      } catch (error) {
        console.error('Error loading stored files:', error);
        localStorage.removeItem('recipientFiles');
      }
    }
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await handleFiles(e.target.files);
    }
  };

  const handleFiles = async (fileList: FileList) => {
    setLoading(true);
    setError('');
    
    const newFiles: RecipientFile[] = [];
    
    for (const file of Array.from(fileList)) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        try {
          console.log(`Processing file: ${file.name}`);
          const recipients = await parseCSV(file);
          
          if (recipients.length === 0) {
            setError('No valid recipients found in CSV. Please ensure your CSV has an "address" column with valid Ethereum addresses.');
            continue;
          }

          console.log(`Found ${recipients.length} valid recipients`);
          const { merkleRoot, proofs } = createMerkleTree(recipients);

          const newFile: RecipientFile = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: `${(file.size / 1024).toFixed(1)} KB`,
            count: recipients.length,
            date: new Date().toISOString().split('T')[0],
            merkleRoot,
            distributorAddress: undefined,
            recipients,
            proofs,
          };
          
          newFiles.push(newFile);
          console.log(`✅ Successfully processed ${file.name}`);
        } catch (error) {
          console.error('Error processing CSV:', error);
          setError(
            error instanceof Error
              ? error.message
              : 'Failed to process CSV file. Please ensure it has a valid "address" column with Ethereum addresses.'
          );
        }
      } else {
        setError('Please upload a valid CSV file.');
      }
    }
    
    if (newFiles.length > 0) {
      setFiles((prev) => {
        const updatedFiles = [...prev, ...newFiles];
        localStorage.setItem('recipientFiles', JSON.stringify(updatedFiles));
        return updatedFiles;
      });
      setError('');
    }
    
    setLoading(false);
  };

  const removeFile = (id: string) => {
    setFiles((prevFiles) => {
      const updatedFiles = prevFiles.filter((file) => file.id !== id);
      localStorage.setItem('recipientFiles', JSON.stringify(updatedFiles));
      return updatedFiles;
    });
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <DashBoardLayout>
      <div className="bg-[#201726] text-white">
        <header className="border-b border-purple-500/20 p-4">
          <div className="container flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-6 w-6" />
              <span className="text-xl font-bold">LaunchPad</span>
            </div>
          </div>
        </header>

        <main className="container py-8">
          <div className="mb-6 flex items-center">
            <Link href="/dashboard/token-creator">
              <Button
                variant="ghost"
                className="text-purple-100 hover:bg-purple-500/10 hover:text-purple-200"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="ml-4 text-2xl font-bold">Manage Recipients</h1>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <Card className="bg-zinc-900 border-purple-500/20">
                <CardHeader>
                  <CardTitle>Recipient Lists</CardTitle>
                  <CardDescription>
                    Manage your CSV files containing recipient addresses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {error && (
                    <Alert className="mb-4 bg-red-500/10 border-red-500/20">
                      <AlertDescription className="text-red-300">{error}</AlertDescription>
                    </Alert>
                  )}
                  {loading && (
                    <Alert className="mb-4 bg-blue-500/10 border-blue-500/20">
                      <AlertDescription className="text-blue-300">Processing CSV file...</AlertDescription>
                    </Alert>
                  )}
                  {files.length > 0 ? (
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-purple-500/20">
                            <TableHead>File Name</TableHead>
                            <TableHead>Recipients</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead>Date Added</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {files.map((file) => (
                            <TableRow key={file.id} className="border-purple-500/20">
                              <TableCell className="font-medium">
                                <div className="flex items-center">
                                  <FileText className="mr-2 h-4 w-4 text-purple-400" />
                                  {file.name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="border-purple-500 text-purple-100"
                                >
                                  {file.count} addresses
                                </Badge>
                              </TableCell>
                              <TableCell>{file.size}</TableCell>
                              <TableCell>{file.date}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeFile(file.id)}
                                  className="text-purple-100 hover:bg-red-500/10 hover:text-red-400"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  ) : (
                    <div className="flex h-[400px] flex-col items-center justify-center text-center">
                      <FileText className="mb-4 h-12 w-12 text-purple-400/50" />
                      <p className="mb-2 text-lg font-medium">No files uploaded</p>
                      <p className="text-sm text-purple-100/70">Upload a CSV file to get started</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    className="border-purple-500 text-purple-100 hover:bg-purple-500/10"
                    onClick={onButtonClick}
                    disabled={loading}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {loading ? 'Processing...' : 'Add File'}
                  </Button>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="tokenAddress">Token Address</Label>
                    <Input
                      id="tokenAddress"
                      placeholder="Enter ERC20 token address (0x...)"
                      value={tokenAddress}
                      onChange={(e) => setTokenAddress(e.target.value)}
                      className="bg-[#2A1F36] border-purple-500/20 focus:border-purple-500 text-white"
                    />
                    {tokenDetails && (
                      <div className="text-sm text-purple-100/70">
                        Token: {tokenDetails.name} ({tokenDetails.symbol}), Decimals: {tokenDetails.decimals}
                      </div>
                    )}
                    <Link
                      href={
                        tokenAddress && tokenDetails && files.length > 0
                          ? `/dashboard/token-creator/airdrop-listing/distribute/${tokenAddress}`
                          : '#'
                      }
                    >
                      <Button
                        className="bg-purple-500 hover:bg-purple-600 text-black"
                        disabled={!tokenAddress || !tokenDetails || files.length === 0 || loading}
                      >
                        Continue to Distribution
                      </Button>
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            </div>

            <div>
              <Card className="bg-zinc-900 border-purple-500/20">
                <CardHeader>
                  <CardTitle>Upload New File</CardTitle>
                  <CardDescription>Upload a CSV file with wallet addresses</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onDragEnter={handleDrag} className="flex flex-col items-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleChange}
                      className="hidden"
                    />
                    <div
                      className={`flex h-[200px] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                        dragActive
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-purple-500/20 hover:border-purple-500/50 hover:bg-purple-500/5'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={loading ? undefined : onButtonClick}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={loading ? undefined : handleDrop}
                    >
                      <Upload className="mb-4 h-10 w-10 text-purple-400" />
                      <p className="mb-2 text-center font-medium">
                        {loading ? 'Processing...' : 'Drag and drop your CSV file here'}
                      </p>
                      <p className="text-sm text-purple-100/70">
                        {loading ? 'Please wait' : 'or click to browse'}
                      </p>
                    </div>
                  </form>
                  <Alert className="mt-4 bg-purple-500/10 border-purple-500/20">
                    <AlertDescription className="text-sm text-purple-100/70">
                      Your CSV file must have an <code>address</code> column with valid Ethereum addresses.
                      <br />
                      Accepted column names: <code>address</code>, <code>wallet</code>, <code>recipient</code>
                      <br />
                      Example format:
                      <br />
                      <code>address</code>
                      <br />
                      <code>0x123...</code>
                      <br />
                      <code>0x456...</code>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </DashBoardLayout>
  );
}