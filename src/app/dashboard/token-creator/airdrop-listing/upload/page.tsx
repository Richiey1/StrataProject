'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useReadContract, useReadContracts } from 'wagmi';
import { Abi } from 'viem';
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
import { ArrowLeft, Upload, FileText, Trash2, Plus, Coins } from 'lucide-react';
import { Badge } from '../../../../../../components/ui/badge';
import { ScrollArea } from '../../../../../../components/ui/scroll-area';
import { Alert, AlertDescription } from '../../../../../../components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../../components/ui/select';
import { Label } from '../../../../../../components/ui/label';
import DashBoardLayout from '../../../../dashboard/token-creator/DashboardLayout';
import StrataForgeFactoryABI from '../../../../components/ABIs/StrataForgeFactoryABI.json';
import { parseCSV, createMerkleTree, Recipient } from '../../../../../lib/merkle';
import { useWallet } from '../../../../../contexts/WalletContext';

type RecipientFile = {
  id: string;
  name: string;
  size: string;
  count: number;
  date: string;
  merkleRoot: string;
  recipients: Recipient[];
  proofs: { [address: string]: string[] };
};


const FACTORY_CONTRACT_ADDRESS = '0x59F42c3eEcf829b34d8Ca846Dfc83D3cDC105C3F' as const;

export default function UploadPage() {
  const [files, setFiles] = useState<RecipientFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState<string>('');
  const [tokens, setTokens] = useState<
    { id: number; name: string; symbol: string; address: string; type: string }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { address, isConnected } = useWallet();

  // Fetch total token count
  const { data: totalTokens } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: StrataForgeFactoryABI as Abi,
    functionName: 'getTotalTokenCount',
    query: { enabled: isConnected },
  });

  // Create array of token read calls
  const tokenCalls = totalTokens
    ? Array.from({ length: Number(totalTokens) }, (_, i) => ({
        address: FACTORY_CONTRACT_ADDRESS,
        abi: StrataForgeFactoryABI as Abi,
        functionName: 'getTokenById',
        args: [i + 1],
      }))
    : [];

  // Fetch all tokens
  const { data: tokenData } = useReadContracts({
    contracts: tokenCalls,
    query: { enabled: tokenCalls.length > 0 },
  });

  // Process tokens
  useEffect(() => {
    if (tokenData && tokenData.length > 0 && address) {
      const userTokens = tokenData
        .map((result, index) => {
          if (result.status === 'success' && result.result) {
            const token = result.result as { name: string; symbol: string; tokenAddress: string; creator: string };
            if (
              token.name &&
              token.symbol &&
              token.tokenAddress &&
              token.creator &&
              token.creator.toLowerCase() === address.toLowerCase()
            ) {
              let type = 'erc20';
              if (token.name.toLowerCase().includes('nft')) type = 'erc721';
              else if (token.name.toLowerCase().includes('meme') || token.name.toLowerCase().includes('doge'))
                type = 'meme';
              else if (token.name.toLowerCase().includes('usd') || token.name.toLowerCase().includes('stable'))
                type = 'stable';
              return {
                id: index + 1,
                name: token.name,
                symbol: token.symbol,
                address: token.tokenAddress,
                type,
              };
            }
            return null;
          }
          return null;
        })
        .filter((token): token is NonNullable<typeof token> => token !== null);
      setTokens(userTokens);
    }
  }, [tokenData, address]);

  // Load recipient files from local storage
  useEffect(() => {
    const storedFiles = localStorage.getItem('recipientFiles');
    if (storedFiles) {
      setFiles(JSON.parse(storedFiles));
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
    const newFiles: RecipientFile[] = [];
    for (const file of Array.from(fileList)) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        try {
          const recipients = await parseCSV(file);
          if (recipients.length === 0) {
            alert('No valid addresses found in CSV.');
            continue;
          }
          const { merkleRoot, proofs } = createMerkleTree(recipients);
          const newFile: RecipientFile = {
            id: Date.now().toString(),
            name: file.name,
            size: `${(file.size / 1024).toFixed(1)} KB`,
            count: recipients.length,
            date: new Date().toISOString().split('T')[0],
            merkleRoot,
            recipients,
            proofs,
          };
          newFiles.push(newFile);
        } catch (error) {
          console.error('Error processing CSV:', error);
          alert("Failed to process CSV file. Ensure it has a valid 'address' column.");
        }
      }
    }
    setFiles((prev) => {
      const updatedFiles = [...prev, ...newFiles];
      localStorage.setItem('recipientFiles', JSON.stringify(updatedFiles));
      return updatedFiles;
    });
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const updatedFiles = prev.filter((file) => file.id !== id);
      localStorage.setItem('recipientFiles', JSON.stringify(updatedFiles));
      return updatedFiles;
    });
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <DashBoardLayout>
      <div className='bg-[#201726] text-purple-100'>
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
            <Link href='/dashboard/token-creator'>
              <Button
                variant='ghost'
                className='text-purple-100 hover:bg-purple-500/10 hover:text-purple-200'
              >
                <ArrowLeft className='mr-2 h-4 w-4' />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className='ml-4 text-2xl font-bold'>Manage Recipients</h1>
          </div>

          <div className='grid gap-6 md:grid-cols-3'>
            <div className='md:col-span-2'>
              <Card className='bg-zinc-900 border-purple-500/20'>
                <CardHeader>
                  <CardTitle>Recipient Lists</CardTitle>
                  <CardDescription>
                    Manage your CSV files containing recipient addresses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {files.length > 0 ? (
                    <ScrollArea className='h-[400px]'>
                      <Table>
                        <TableHeader>
                          <TableRow className='border-purple-500/20'>
                            <TableHead>File Name</TableHead>
                            <TableHead>Recipients</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead>Date Added</TableHead>
                            <TableHead className='text-right'>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {files.map((file) => (
                            <TableRow key={file.id} className='border-purple-500/20'>
                              <TableCell className='font-medium'>
                                <div className='flex items-center'>
                                  <FileText className='mr-2 h-4 w-4 text-purple-400' />
                                  {file.name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant='outline'
                                  className='border-purple-500 text-purple-100'
                                >
                                  {file.count} addresses
                                </Badge>
                              </TableCell>
                              <TableCell>{file.size}</TableCell>
                              <TableCell>{file.date}</TableCell>
                              <TableCell className='text-right'>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  onClick={() => removeFile(file.id)}
                                  className='text-purple-100 hover:bg-red-500/10 hover:text-red-400'
                                >
                                  <Trash2 className='h-4 w-4' />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  ) : (
                    <div className='flex h-[400px] flex-col items-center justify-center text-center'>
                      <FileText className='mb-4 h-12 w-12 text-purple-400/50' />
                      <p className='mb-2 text-lg font-medium'>No files uploaded</p>
                      <p className='text-sm text-purple-100/70'>Upload a CSV file to get started</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className='flex justify-between'>
                  <Button
                    variant='outline'
                    className='border-purple-500 text-purple-100 hover:bg-purple-500/10'
                    onClick={onButtonClick}
                  >
                    <Plus className='mr-2 h-4 w-4' />
                    Add File
                  </Button>
                  <div className='flex flex-col gap-2'>
                    <Label htmlFor='tokenSelect'>Select Token</Label>
                    <Select value={selectedTokenId} onValueChange={setSelectedTokenId}>
                      <SelectTrigger id='tokenSelect' className='bg-[#2A1F36] border-purple-500/20 focus:border-purple-500 text-white'>
                        <SelectValue placeholder='Select a token' />
                      </SelectTrigger>
                      <SelectContent className='bg-[#2A1F36] border-purple-500/20 text-white'>
                        {tokens.map((token) => (
                          <SelectItem key={token.id} value={token.id.toString()}>
                            {token.name} ({token.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Link href={selectedTokenId ? `/dashboard/token-creator/airdrop-listing/distribute/${selectedTokenId}` : '#'}>
                      <Button
                        className='bg-purple-500 hover:bg-purple-600 text-black'
                        disabled={!selectedTokenId}
                      >
                        Continue to Distribution
                      </Button>
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            </div>

            <div>
              <Card className='bg-zinc-900 border-purple-500/20'>
                <CardHeader>
                  <CardTitle>Upload New File</CardTitle>
                  <CardDescription>Upload a CSV file with wallet addresses</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onDragEnter={handleDrag} className='flex flex-col items-center'>
                    <input
                      ref={fileInputRef}
                      type='file'
                      accept='.csv'
                      onChange={handleChange}
                      className='hidden'
                    />
                    <div
                      className={`flex h-[200px] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                        dragActive
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-purple-500/20 hover:border-purple-500/50 hover:bg-purple-500/5'
                      }`}
                      onClick={onButtonClick}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <Upload className='mb-4 h-10 w-10 text-purple-400' />
                      <p className='mb-2 text-center font-medium'>Drag and drop your file here</p>
                      <p className='text-center text-sm text-purple-100/70'>or click to browse</p>
                    </div>
                  </form>

                  <Alert className='mt-4 bg-purple-500/10 border-purple-500/20'>
                    <AlertDescription className='text-sm text-purple-100/80'>
                      Your CSV file should have a column for wallet addresses.
                      <br />
                      Example format: <code>address</code>
                      <br />
                      Optional: Include an <code>amount</code> column if custom amounts are needed.
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