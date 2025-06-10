'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useReadContract, useWriteContract, useAccount, useChainId } from 'wagmi';
import { Abi, isAddress } from 'viem';
import DashboardLayout from '../../../DashboardLayout';
import StrataForgeERC20ImplementationABI from '../../../../../components/ABIs/StrataForgeERC20ImplementationABI.json';
import StrataForgeERC721ImplementationABI from '../../../../../components/ABIs/StrataForgeERC721ImplementationABI.json';
import StrataForgeERC1155ImplementationABI from '../../../../../components/ABIs/StrataForgeERC1155ImplementationABI.json';
import StrataForgeMemecoinImplementationABI from '../../../../../components/ABIs/StrataForgeMemecoinImplementationABI.json';
import StrataForgeStablecoinImplementationABI from '../../../../../components/ABIs/StrataForgeStablecoinImplementationABI.json';
import StrataForgeFactoryABI from '../../../../../components/ABIs/StrataForgeFactoryABI.json';

// Background Shapes Component
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

interface TokenDetails {
  name: string;
  symbol: string;
  decimals?: number;
}

interface TokenInfo {
  tokenAddress: string;
  name: string;
  symbol: string;
  tokenType: bigint;
}

const FACTORY_CONTRACT_ADDRESS = '0x59F42c3eEcf829b34d8Ca846Dfc83D3cDC105C3F' as const;
const BASE_SEPOLIA_CHAIN_ID = 84532; // Chain ID for Base Sepolia

const ManageToken = () => {
  const { id: tokenId } = useParams<{ id: string }>();
  const { address: account } = useAccount();
  const chainId = useChainId();
  const [tokenType, setTokenType] = useState<'erc20' | 'erc721' | 'erc1155' | 'meme' | 'stable' | null>(null);
  const [tokenDetails, setTokenDetails] = useState<TokenDetails | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<string | null>(null);
  const [formInputs, setFormInputs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [inputErrors, setInputErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const { writeContract, isPending, error: writeError } = useWriteContract();

  // Validate numeric input
  const validateNumber = (value: string, allowZero: boolean = true): string | null => {
    if (value === '') return allowZero ? null : 'Value cannot be empty';
    const num = Number(value);
    if (isNaN(num)) return 'Must be a valid number';
    if (num < 0) return 'Number cannot be negative';
    if (!allowZero && num === 0) return 'Number cannot be zero';
    return null;
  };

  // Handle modal form input changes
  const handleInputChange = (key: string, value: string, isNumber: boolean = false) => {
    setFormInputs((prev) => ({
      ...prev,
      [key]: value,
    }));

    if (isNumber) {
      const error = validateNumber(value, true);
      setInputErrors((prev) => ({
        ...prev,
        [key]: error || '',
      }));
    } else {
      setInputErrors((prev) => ({
        ...prev,
        [key]: '',
      }));
    }
  };

  // Approve collateral token for stablecoin mint
  const handleApproveCollateral = async (collateralToken: string, amount: bigint) => {
    try {
      await writeContract({
        address: collateralToken as `0x${string}`,
        abi: StrataForgeERC20ImplementationABI as Abi, // Assuming collateral is ERC20
        functionName: 'approve',
        args: [tokenAddress, amount],
        account: account as `0x${string}`,
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve collateral');
      return false;
    }
  };

  // Fetch TokenInfo from factory
  const { data: tokenInfo, error: tokenInfoError, isLoading: tokenInfoLoading } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: StrataForgeFactoryABI as Abi,
    functionName: 'getTokenById',
    args: [BigInt(tokenId || '0')],
    query: { enabled: !!tokenId && !isNaN(Number(tokenId)) },
  });

  // Extract tokenAddress and type from TokenInfo
  const tokenAddress = tokenInfo ? (tokenInfo as TokenInfo).tokenAddress : null;
  const factoryTokenType = tokenInfo ? Number((tokenInfo as TokenInfo).tokenType) : null;

  // Map factory token type to local token type
  useEffect(() => {
    if (factoryTokenType !== null) {
      const typeMap: { [key: number]: 'erc20' | 'erc721' | 'erc1155' | 'meme' | 'stable' } = {
        0: 'erc20',
        1: 'erc721',
        2: 'erc1155',
        3: 'meme',
        4: 'stable',
      };
      setTokenType(typeMap[factoryTokenType] || null);
    }
  }, [factoryTokenType]);

  // ABIs for different token types
  const tokenABIs: Record<string, Abi> = {
    erc20: StrataForgeERC20ImplementationABI as Abi,
    erc721: StrataForgeERC721ImplementationABI as Abi,
    erc1155: StrataForgeERC1155ImplementationABI as Abi,
    meme: StrataForgeMemecoinImplementationABI as Abi,
    stable: StrataForgeStablecoinImplementationABI as Abi,
  };

  // Fetch collateral token address for stablecoin
  const { data: collateralToken } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenABIs.stable,
    functionName: 'collateralToken',
    query: { enabled: !!tokenAddress && isAddress(tokenAddress) && tokenType === 'stable' },
  });

  // Hook calls for token type detection (fallback if factory type fails)
  const erc721InterfaceCheck = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenABIs.erc721,
    functionName: 'supportsInterface',
    args: ['0x80ac58cd'],
    query: { enabled: !!tokenAddress && isAddress(tokenAddress) && !tokenType },
  });

  const erc1155InterfaceCheck = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenABIs.erc1155,
    functionName: 'supportsInterface',
    args: ['0xd9b67a26'],
    query: { enabled: !!tokenAddress && isAddress(tokenAddress) && !tokenType },
  });

  const memeMaxWalletCheck = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenABIs.meme,
    functionName: 'maxWalletSize',
    query: { enabled: !!tokenAddress && isAddress(tokenAddress) && !tokenType },
  });

  const stableCollateralCheck = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenABIs.stable,
    functionName: 'collateralToken',
    query: { enabled: !!tokenAddress && isAddress(tokenAddress) && !tokenType },
  });

  const erc20DecimalsCheck = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenABIs.erc20,
    functionName: 'decimals',
    query: { enabled: !!tokenAddress && isAddress(tokenAddress) && !tokenType },
  });

  // Detect token type (fallback if not set by factory)
  useEffect(() => {
    if (tokenType || !tokenAddress || !isAddress(tokenAddress)) return;

    const detectTokenType = () => {
      try {
        if (erc721InterfaceCheck.data) {
          setTokenType('erc721');
          return;
        }

        if (erc1155InterfaceCheck.data) {
          setTokenType('erc1155');
          return;
        }

        if (memeMaxWalletCheck.data !== undefined && !memeMaxWalletCheck.error) {
          setTokenType('meme');
          return;
        }

        if (stableCollateralCheck.data !== undefined && !stableCollateralCheck.error) {
          setTokenType('stable');
          return;
        }

        if (erc20DecimalsCheck.data !== undefined && !erc20DecimalsCheck.error) {
          setTokenType('erc20');
          return;
        }

        if (
          erc721InterfaceCheck.isLoading ||
          erc1155InterfaceCheck.isLoading ||
          memeMaxWalletCheck.isLoading ||
          stableCollateralCheck.isLoading ||
          erc20DecimalsCheck.isLoading
        ) {
          return;
        }

        setError('Unknown token type');
      } catch (err) {
        setError('Failed to detect token type');
        console.error(err);
      } finally {
        if (!tokenType) setLoading(false);
      }
    };

    detectTokenType();
  }, [
    tokenType,
    tokenAddress,
    erc721InterfaceCheck.data,
    erc721InterfaceCheck.isLoading,
    erc1155InterfaceCheck.data,
    erc1155InterfaceCheck.isLoading,
    memeMaxWalletCheck.data,
    memeMaxWalletCheck.error,
    memeMaxWalletCheck.isLoading,
    stableCollateralCheck.data,
    stableCollateralCheck.error,
    stableCollateralCheck.isLoading,
    erc20DecimalsCheck.data,
    erc20DecimalsCheck.error,
    erc20DecimalsCheck.isLoading,
  ]);

  // Hook calls for token details
  const nameQuery = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenType ? tokenABIs[tokenType] : tokenABIs.erc20,
    functionName: 'name',
    query: { enabled: !!tokenType && !!tokenAddress && isAddress(tokenAddress) && tokenType !== 'erc1155' },
  });

  const symbolQuery = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenType ? tokenABIs[tokenType] : tokenABIs.erc20,
    functionName: 'symbol',
    query: { enabled: !!tokenType && !!tokenAddress && isAddress(tokenAddress) && tokenType !== 'erc1155' },
  });

  const decimalsQuery = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenType ? tokenABIs[tokenType] : tokenABIs.erc20,
    functionName: 'decimals',
    query: {
      enabled:
        !!tokenType &&
        !!tokenAddress &&
        isAddress(tokenAddress) &&
        (tokenType === 'erc20' || tokenType === 'meme' || tokenType === 'stable'),
    },
  });

  const ownerQuery = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenType ? tokenABIs[tokenType] : tokenABIs.erc20,
    functionName: 'owner',
    query: { enabled: !!tokenType && !!tokenAddress && isAddress(tokenAddress) },
  });

  // Fetch token details and owner status
  useEffect(() => {
    if (!tokenType || !tokenAddress || !isAddress(tokenAddress) || !tokenInfo) return;

    const owner = ownerQuery.data as string;

    if (tokenType === 'erc1155') {
      const factoryName = (tokenInfo as TokenInfo).name;
      const factorySymbol = (tokenInfo as TokenInfo).symbol;
      if (factoryName && factorySymbol) {
        setTokenDetails({ name: factoryName, symbol: factorySymbol });
      }
    } else {
      const name = nameQuery.data as string;
      const symbol = symbolQuery.data as string;
      const decimals = decimalsQuery.data as number | undefined;
      if (name && symbol) {
        setTokenDetails({ name, symbol, decimals });
      }
    }

    setIsOwner(Boolean(owner && account && owner.toLowerCase() === account.toLowerCase()));
    setLoading(false);
  }, [
    tokenType,
    tokenAddress,
    account,
    tokenInfo,
    nameQuery.data,
    symbolQuery.data,
    decimalsQuery.data,
    ownerQuery.data,
  ]);

  // Handle errors from tokenInfo
  useEffect(() => {
    if (tokenInfoError) {
      setError('Invalid token ID or token not found');
      setLoading(false);
    }
    if (tokenId && isNaN(Number(tokenId))) {
      setError('Invalid token ID format');
      setLoading(false);
    }
  }, [tokenInfoError, tokenId]);

  // Static read functions
  const staticReadFunctions: Record<string, { name: string; label: string; args?: unknown[] }[]> = {
    erc20: [
      { name: 'name', label: 'Name' },
      { name: 'symbol', label: 'Symbol' },
      { name: 'decimals', label: 'Decimals' },
      { name: 'totalSupply', label: 'Total Supply' },
      { name: 'balanceOf', label: 'Your Balance', args: [account] },
      { name: 'paused', label: 'Paused' },
      { name: 'owner', label: 'Owner' },
    ],
    erc721: [
      { name: 'name', label: 'Name' },
      { name: 'symbol', label: 'Symbol' },
      { name: 'balanceOf', label: 'Your Balance', args: [account] },
      { name: 'paused', label: 'Paused' },
      { name: 'owner', label: 'Owner' },
    ],
    erc1155: [
      { name: 'paused', label: 'Paused' },
      { name: 'owner', label: 'Owner' },
    ],
    meme: [
      { name: 'name', label: 'Name' },
      { name: 'symbol', label: 'Symbol' },
      { name: 'decimals', label: 'Decimals' },
      { name: 'totalSupply', label: 'Total Supply' },
      { name: 'balanceOf', label: 'Your Balance', args: [account] },
      { name: 'maxWalletSize', label: 'Max Wallet Size' },
      { name: 'maxTransactionAmount', label: 'Max Transaction Amount' },
      { name: 'isExcludedFromLimits', label: 'Excluded from Limits', args: [account] },
      { name: 'paused', label: 'Paused' },
      { name: 'owner', label: 'Owner' },
    ],
    stable: [
      { name: 'name', label: 'Name' },
      { name: 'symbol', label: 'Symbol' },
      { name: 'decimals', label: 'Decimals' },
      { name: 'totalSupply', label: 'Total Supply' },
      { name: 'balanceOf', label: 'Your Balance', args: [account] },
      { name: 'collateralToken', label: 'Collateral Token' },
      { name: 'collateralRatio', label: 'Collateral Ratio' },
      { name: 'treasury', label: 'Treasury' },
      { name: 'mintFee', label: 'Mint Fee' },
      { name: 'redeemFee', label: 'Redeem Fee' },
      { name: 'collateralDeposited', label: 'Your Collateral Deposited', args: [account] },
      { name: 'paused', label: 'Paused' },
      { name: 'owner', label: 'Owner' },
    ],
  };

  // Query read functions
  const queryReadFunctions: Record<string, { name: string; label: string; inputLabels: string[] }[]> = {
    erc20: [
      {
        name: 'allowance',
        label: 'Allowance for Spender',
        inputLabels: ['Owner Address', 'Spender Address'],
      },
    ],
    erc721: [
      {
        name: 'ownerOf',
        label: 'Owner of Token ID',
        inputLabels: ['Token ID'],
      },
      {
        name: 'tokenURI',
        label: 'Token URI',
        inputLabels: ['Token ID'],
      },
      {
        name: 'getApproved',
        label: 'Approved Address for Token ID',
        inputLabels: ['Token ID'],
      },
      {
        name: 'isApprovedForAll',
        label: 'Operator Approval',
        inputLabels: ['Owner Address', 'Operator Address'],
      },
    ],
    erc1155: [
      {
        name: 'balanceOf',
        label: 'Balance of Token ID',
        inputLabels: ['Account Address', 'Token ID'],
      },
      {
        name: 'uri',
        label: 'URI for Token ID',
        inputLabels: ['Token ID'],
      },
      {
        name: 'isApprovedForAll',
        label: 'Operator Approval',
        inputLabels: ['Owner Address', 'Operator Address'],
      },
    ],
    meme: [
      {
        name: 'allowance',
        label: 'Allowance for Spender',
        inputLabels: ['Owner Address', 'Spender Address'],
      },
    ],
    stable: [
      {
        name: 'allowance',
        label: 'Allowance for Spender',
        inputLabels: ['Owner Address', 'Spender Address'],
      },
    ],
  };

  // Write functions
  const writeFunctions: Record<
    string,
    { name: string; args: string[]; inputs: { label: string; type: string; default?: string }[]; ownerOnly?: boolean }[]
  > = {
    erc20: [
      {
        name: 'transfer',
        args: ['to', 'amount'],
        inputs: [
          { label: 'To Address', type: 'address' },
          { label: 'Amount', type: 'number' },
        ],
      },
      {
        name: 'approve',
        args: ['spender', 'amount'],
        inputs: [
          { label: 'Spender Address', type: 'address' },
          { label: 'Amount', type: 'number' },
        ],
      },
      {
        name: 'transferFrom',
        args: ['from', 'to', 'amount'],
        inputs: [
          { label: 'From Address', type: 'address' },
          { label: 'To Address', type: 'address' },
          { label: 'Amount', type: 'number' },
        ],
      },
      {
        name: 'increaseAllowance',
        args: ['spender', 'addedValue'],
        inputs: [
          { label: 'Spender Address', type: 'address' },
          { label: 'Added Value', type: 'number' },
        ],
      },
      {
        name: 'decreaseAllowance',
        args: ['spender', 'subtractedValue'],
        inputs: [
          { label: 'Spender Address', type: 'address' },
          { label: 'Subtracted Value', type: 'number' },
        ],
      },
      {
        name: 'mint',
        args: ['to', 'amount'],
        inputs: [
          { label: 'To Address', type: 'address' },
          { label: 'Amount', type: 'number' },
        ],
        ownerOnly: true,
      },
      {
        name: 'burn',
        args: ['amount'],
        inputs: [{ label: 'Amount', type: 'number' }],
      },
      {
        name: 'pause',
        args: [],
        inputs: [],
        ownerOnly: true,
      },
      {
        name: 'unpause',
        args: [],
        inputs: [],
        ownerOnly: true,
      },
      {
        name: 'renounceOwnership',
        args: [],
        inputs: [],
        ownerOnly: true,
      },
      {
        name: 'transferOwnership',
        args: ['newOwner'],
        inputs: [{ label: 'New Owner Address', type: 'address' }],
        ownerOnly: true,
      },
    ],
    erc721: [
      {
        name: 'mint',
        args: ['to'],
        inputs: [{ label: 'To Address', type: 'address' }],
        ownerOnly: true,
      },
      {
        name: 'mintWithURI',
        args: ['to', 'uri'],
        inputs: [
          { label: 'To Address', type: 'address' },
          { label: 'Token URI', type: 'text' },
        ],
        ownerOnly: true,
      },
      {
        name: 'setBaseURI',
        args: ['baseURI'],
        inputs: [{ label: 'Base URI', type: 'text' }],
        ownerOnly: true,
      },
      {
        name: 'approve',
        args: ['to', 'tokenId'],
        inputs: [
          { label: 'To Address', type: 'address' },
          { label: 'Token ID', type: 'number' },
        ],
      },
      {
        name: 'setApprovalForAll',
        args: ['operator', 'approved'],
        inputs: [
          { label: 'Operator Address', type: 'address' },
          { label: 'Approved', type: 'checkbox' },
        ],
      },
      {
        name: 'transferFrom',
        args: ['from', 'to', 'tokenId'],
        inputs: [
          { label: 'From Address', type: 'address' },
          { label: 'To Address', type: 'address' },
          { label: 'Token ID', type: 'number' },
        ],
      },
      {
        name: 'safeTransferFrom',
        args: ['from', 'to', 'tokenId'],
        inputs: [
          { label: 'From Address', type: 'address' },
          { label: 'To Address', type: 'address' },
          { label: 'Token ID', type: 'number' },
        ],
      },
      {
        name: 'safeTransferFrom',
        args: ['from', 'to', 'tokenId', 'data'],
        inputs: [
          { label: 'From Address', type: 'address' },
          { label: 'To Address', type: 'address' },
          { label: 'Token ID', type: 'number' },
          { label: 'Data', type: 'text', default: '0x' },
        ],
      },
      {
        name: 'pause',
        args: [],
        inputs: [],
        ownerOnly: true,
      },
      {
        name: 'unpause',
        args: [],
        inputs: [],
        ownerOnly: true,
      },
      {
        name: 'renounceOwnership',
        args: [],
        inputs: [],
        ownerOnly: true,
      },
      {
        name: 'transferOwnership',
        args: ['newOwner'],
        inputs: [{ label: 'New Owner Address', type: 'address' }],
        ownerOnly: true,
      },
    ],
    erc1155: [
      {
        name: 'mint',
        args: ['to', 'id', 'amount', 'data'],
        inputs: [
          { label: 'To Address', type: 'address' },
          { label: 'Token ID', type: 'number' },
          { label: 'Amount', type: 'number' },
          { label: 'Data', type: 'text', default: '0x' },
        ],
        ownerOnly: true,
      },
      {
        name: 'setURI',
        args: ['newuri'],
        inputs: [{ label: 'New URI', type: 'text' }],
        ownerOnly: true,
      },
      {
        name: 'setTokenURI',
        args: ['id', 'tokenURI'],
        inputs: [
          { label: 'Token ID', type: 'number' },
          { label: 'Token URI', type: 'text' },
        ],
        ownerOnly: true,
      },
      {
        name: 'setApprovalForAll',
        args: ['operator', 'approved'],
        inputs: [
          { label: 'Operator Address', type: 'address' },
          { label: 'Approved', type: 'checkbox' },
        ],
      },
      {
        name: 'safeTransferFrom',
        args: ['from', 'to', 'id', 'amount', 'data'],
        inputs: [
          { label: 'From Address', type: 'address' },
          { label: 'To Address', type: 'address' },
          { label: 'Token ID', type: 'number' },
          { label: 'Amount', type: 'number' },
          { label: 'Data', type: 'text', default: '0x' },
        ],
      },
      {
        name: 'safeBatchTransferFrom',
        args: ['from', 'to', 'ids', 'amounts', 'data'],
        inputs: [
          { label: 'From Address', type: 'address' },
          { label: 'To Address', type: 'address' },
          { label: 'Token IDs (comma-separated)', type: 'text' },
          { label: 'Amounts (comma-separated)', type: 'text' },
          { label: 'Data', type: 'text', default: '0x' },
        ],
      },
      {
        name: 'pause',
        args: [],
        inputs: [],
        ownerOnly: true,
      },
      {
        name: 'unpause',
        args: [],
        inputs: [],
        ownerOnly: true,
      },
      {
        name: 'renounceOwnership',
        args: [],
        inputs: [],
        ownerOnly: true,
      },
      {
        name: 'transferOwnership',
        args: ['newOwner'],
        inputs: [{ label: 'New Owner Address', type: 'address' }],
        ownerOnly: true,
      },
    ],
    meme: [
      {
        name: 'transfer',
        args: ['to', 'amount'],
        inputs: [
          { label: 'To Address', type: 'address' },
          { label: 'Amount', type: 'number' },
        ],
      },
      {
        name: 'approve',
        args: ['spender', 'amount'],
        inputs: [
          { label: 'Spender Address', type: 'address' },
          { label: 'Amount', type: 'number' },
        ],
      },
      {
        name: 'transferFrom',
        args: ['from', 'to', 'amount'],
        inputs: [
          { label: 'From Address', type: 'address' },
          { label: 'To Address', type: 'address' },
          { label: 'Amount', type: 'number' },
        ],
      },
      {
        name: 'increaseAllowance',
        args: ['spender', 'addedValue'],
        inputs: [
          { label: 'Spender Address', type: 'address' },
          { label: 'Added Value', type: 'number' },
        ],
      },
      {
        name: 'decreaseAllowance',
        args: ['spender', 'subtractedValue'],
        inputs: [
          { label: 'Spender Address', type: 'address' },
          { label: 'Subtracted Value', type: 'number' },
        ],
      },
      {
        name: 'mint',
        args: ['to', 'amount'],
        inputs: [
          { label: 'To Address', type: 'address' },
          { label: 'Amount', type: 'number' },
        ],
        ownerOnly: true,
      },
      {
        name: 'burn',
        args: ['amount'],
        inputs: [{ label: 'Amount', type: 'number' }],
      },
      {
        name: 'setMaxWalletSize',
        args: ['amount'],
        inputs: [{ label: 'Max Wallet Size', type: 'number' }],
        ownerOnly: true,
      },
      {
        name: 'setMaxTransactionAmount',
        args: ['amount'],
        inputs: [{ label: 'Max Transaction Amount', type: 'number' }],
        ownerOnly: true,
      },
      {
        name: 'excludeFromLimits',
        args: ['account', 'excluded'],
        inputs: [
          { label: 'Account Address', type: 'address' },
          { label: 'Excluded', type: 'checkbox' },
        ],
        ownerOnly: true,
      },
      {
        name: 'pause',
        args: [],
        inputs: [],
        ownerOnly: true,
      },
      {
        name: 'unpause',
        args: [],
        inputs: [],
        ownerOnly: true,
      },
      {
        name: 'renounceOwnership',
        args: [],
        inputs: [],
        ownerOnly: true,
      },
      {
        name: 'transferOwnership',
        args: ['newOwner'],
        inputs: [{ label: 'New Owner Address', type: 'address' }],
        ownerOnly: true,
      },
    ],
    stable: [
      {
        name: 'transfer',
        args: ['to', 'amount'],
        inputs: [
          { label: 'To Address', type: 'address' },
          { label: 'Amount', type: 'number' },
        ],
      },
      {
        name: 'approve',
        args: ['spender', 'amount'],
        inputs: [
          { label: 'Spender Address', type: 'address' },
          { label: 'Amount', type: 'number' },
        ],
      },
      {
        name: 'transferFrom',
        args: ['from', 'to', 'amount'],
        inputs: [
          { label: 'From Address', type: 'address' },
          { label: 'To Address', type: 'address' },
          { label: 'Amount', type: 'number' },
        ],
      },
      {
        name: 'increaseAllowance',
        args: ['spender', 'addedValue'],
        inputs: [
          { label: 'Spender Address', type: 'address' },
          { label: 'Added Value', type: 'number' },
        ],
      },
      {
        name: 'decreaseAllowance',
        args: ['spender', 'subtractedValue'],
        inputs: [
          { label: 'Spender Address', type: 'address' },
          { label: 'Subtracted Value', type: 'number' },
        ],
      },
      {
        name: 'mint',
        args: ['collateralAmount'],
        inputs: [{ label: 'Collateral Amount', type: 'number' }],
      },
      {
        name: 'redeem',
        args: ['tokenAmount'],
        inputs: [{ label: 'Token Amount', type: 'number' }],
      },
      {
        name: 'burn',
        args: ['amount'],
        inputs: [{ label: 'Amount', type: 'number' }],
      },
      {
        name: 'setCollateralRatio',
        args: ['_collateralRatio'],
        inputs: [{ label: 'Collateral Ratio', type: 'number' }],
        ownerOnly: true,
      },
      {
        name: 'setFees',
        args: ['_mintFee', '_redeemFee'],
        inputs: [
          { label: 'Mint Fee', type: 'number' },
          { label: 'Redeem Fee', type: 'number' },
        ],
        ownerOnly: true,
      },
      {
        name: 'setTreasury',
        args: ['_treasury'],
        inputs: [{ label: 'Treasury Address', type: 'address' }],
        ownerOnly: true,
      },
      {
        name: 'pause',
        args: [],
        inputs: [],
        ownerOnly: true,
      },
      {
        name: 'unpause',
        args: [],
        inputs: [],
        ownerOnly: true,
      },
      {
        name: 'renounceOwnership',
        args: [],
        inputs: [],
        ownerOnly: true,
      },
      {
        name: 'transferOwnership',
        args: ['newOwner'],
        inputs: [{ label: 'New Owner Address', type: 'address' }],
        ownerOnly: true,
      },
    ],
  };

  // Execute write function
  const handleWrite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalAction || !tokenType || !tokenAddress || !account) {
      setError('Missing required parameters');
      return;
    }

    if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
      setError('Please connect to Base Sepolia network');
      return;
    }

    const action = writeFunctions[tokenType].find((f) => f.name === modalAction);
    if (!action) {
      setError('Invalid action');
      return;
    }

    try {
      const args = action.args.map((arg, index) => {
        // Use input label as key, mapped to arg name
        const input = action.inputs[index];
        const value = formInputs[input.label];
        if (value === undefined) throw new Error(`Missing ${arg}`);
        if (
          arg.includes('address') ||
          arg.includes('to') ||
          arg.includes('from') ||
          arg.includes('spender') ||
          arg.includes('operator') ||
          arg.includes('account') ||
          arg.includes('treasury') ||
          arg.includes('newOwner')
        ) {
          if (!isAddress(value)) throw new Error(`Invalid address for ${arg}`);
          return value;
        }
        if (
          arg.includes('amount') ||
          arg.includes('id') ||
          arg.includes('tokenId') ||
          arg.includes('fee') ||
          arg.includes('ratio') ||
          arg.includes('addedValue') ||
          arg.includes('subtractedValue') ||
          arg.includes('collateralAmount') ||
          arg.includes('tokenAmount')
        ) {
          const num = Number(value);
          if (isNaN(num)) throw new Error(`Invalid number for ${arg}`);
          if (num < 0) throw new Error(`Number cannot be negative for ${arg}`);
          if (value === '') throw new Error(`Value for ${arg} cannot be empty`);
          return BigInt(num);
        }
        if (arg === 'ids' || arg === 'amounts') {
          const values = value.split(',').map((v) => {
            const num = Number(v.trim());
            if (isNaN(num)) throw new Error(`Invalid number in ${arg}`);
            if (num <= 0) throw new Error(`Numbers in ${arg} must be positive`);
            return BigInt(num);
          });
          return values;
        }
        if (arg === 'approved' || arg === 'excluded') {
          return value === 'true';
        }
        return value;
      });

      // For stablecoin mint, approve collateral token
      if (tokenType === 'stable' && modalAction === 'mint' && collateralToken) {
        const collateralAmount = args[0] as bigint;
        const approved = await handleApproveCollateral(collateralToken as string, collateralAmount);
        if (!approved) return;
      }

      await writeContract({
        address: tokenAddress as `0x${string}`,
        abi: tokenABIs[tokenType],
        functionName: modalAction,
        args,
        account: account as `0x${string}`,
      });

      setModalOpen(false);
      setFormInputs({});
      setInputErrors({});
      setError(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMessage);
    }
  };

  // Open modal for write action
  const openModal = (action: string) => {
    setModalAction(action);
    setModalOpen(true);
    setFormInputs({});
    setInputErrors({});
  };

  // Render read function result
  const ReadCard = ({
    func,
    isQuery = false,
    inputLabels = [],
  }: {
    func: { name: string; label: string; args?: unknown[] };
    isQuery?: boolean;
    inputLabels?: string[];
  }) => {
    const [isQueryTriggered, setIsQueryTriggered] = useState(false);

    // Handle dynamic args for functions
    const dynamicArgs = (func.args || []).map((arg: unknown, index: number) => {
      if (typeof arg === 'string' && arg === '' && isQuery) {
        return formInputs[`${func.name}_${inputLabels[index]}`] || '';
      }
      return arg;
    });

    // Reset query trigger when inputs change
    useEffect(() => {
      if (isQuery) {
        setIsQueryTriggered(false);
      }
    }, [dynamicArgs, isQuery]);

    const { data, error: readError, isLoading } = useReadContract({
      address: tokenAddress as `0x${string}`,
      abi: tokenABIs[tokenType!],
      functionName: func.name,
      args: dynamicArgs,
      query: {
        enabled:
          !!tokenType &&
          !!tokenAddress &&
          (!isQuery || (isQueryTriggered && dynamicArgs.every((arg: unknown) => arg !== ''))),
      },
    });

    return (
      <div className="bg-[#1E1425]/80 rounded-xl p-4">
        <p className="text-gray-300 text-sm font-medium">{func.label}</p>
        {isQuery && (
          <div className="mt-2 space-y-2">
            {inputLabels.map((label, index) => (
              <div key={index}>
                <input
                  type="text"
                  inputMode={label.includes('ID') ? 'numeric' : 'text'}
                  pattern={label.includes('ID') ? '[0-9]*' : undefined}
                  placeholder={`Enter ${label}`}
                  value={formInputs[`${func.name}_${label}`] || ''}
                  onChange={(e) => handleInputChange(`${func.name}_${label}`, e.target.value, label.includes('ID'))}
                  className={`w-full p-2 bg-[#2A1F36] border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    inputErrors[`${func.name}_${label}`] ? 'border-red-500' : ''
                  }`}
                />
                {inputErrors[`${func.name}_${label}`] && (
                  <p className="text-red-300 text-sm mt-1">{inputErrors[`${func.name}_${label}`]}</p>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setIsQueryTriggered(true)}
              disabled={dynamicArgs.some(
                (arg: unknown, idx: number) => arg === '' || inputErrors[`${func.name}_${inputLabels[idx]}`],
              )}
              className="w-full px-3 py-2 bg-gradient-to-r from-purple-500 to-blue-600 text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              Query
            </button>
          </div>
        )}
        <p className="text-white text-lg mt-2 truncate">
          {readError
            ? 'Error fetching data'
            : isLoading
            ? 'Loading...'
            : data?.toString() || 'No data'}
        </p>
      </div>
    );
  };

  // Modal for write actions
  const WriteModal = () => {
    if (!modalOpen || !modalAction || !tokenType) return null;

    const action = writeFunctions[tokenType].find((f) => f.name === modalAction);
    if (!action) return null;

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-[#1E1425] p-6 rounded-xl max-w-md w-full border border-purple-500/20 shadow-2xl">
          <h3 className="text-xl text-white font-semibold mb-4">{action.name}</h3>
          <form onSubmit={handleWrite}>
            {action.inputs.map((input, index) => (
              <div key={index} className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">{input.label}</label>
                {input.type === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={formInputs[input.label] === 'true'}
                    onChange={(e) => handleInputChange(input.label, e.target.checked.toString())}
                    className="mt-1 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                  />
                ) : (
                  <div>
                    <input
                      type="text"
                      inputMode={input.type === 'number' ? 'numeric' : 'text'}
                      pattern={input.type === 'number' ? '[0-9]*' : undefined}
                      value={formInputs[input.label] || input.default || ''}
                      onChange={(e) => handleInputChange(input.label, e.target.value, input.type === 'number')}
                      placeholder={input.label}
                      className={`w-full p-2 bg-[#2A1F36] border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        inputErrors[input.label] ? 'border-red-500' : ''
                      }`}
                    />
                    {inputErrors[input.label] && (
                      <p className="text-red-300 text-sm mt-1">{inputErrors[input.label]}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
            {error && <p className="text-red-300 text-sm mb-2">{error}</p>}
            {writeError && <p className="text-red-300 text-sm mb-2">{writeError.message || 'Transaction error'}</p>}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setModalAction(null);
                  setError(null);
                  setInputErrors({});
                }}
                className="px-4 py-2 bg-gray-600 text-gray-300 rounded-xl hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || Object.values(inputErrors).some((err) => err !== '')}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Processing...' : 'Execute'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading || tokenInfoLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#1A0D23] to-[#2A1F36] relative">
          <BackgroundShapes />
          <div className="w-16 h-16 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin relative z-10"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !tokenType || !tokenDetails || !tokenAddress) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-[#1A0D23] to-[#2A1F36] p-4 md:p-8 relative z-10">
          <div className="bg-red-500/10 border border-red-400/15 rounded-xl p-4 flex items-center space-x-3">
            <p className="text-red-300 font-medium">{error || 'Failed to load token data'}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="relative min-h-screen">
        <div className={`transition-all duration-300 ${modalOpen ? 'blur-md' : ''}`}>
          <BackgroundShapes />
          <div className="p-6 md:p-10 bg-gradient-to-br from-[#1A0D23] to-[#2A1F36]">
            {/* Token Header */}
            <div className="mb-12 relative z-10 max-w-4xl mx-auto">
              <h1 className="font-poppins font-bold text-4xl md:text-5xl text-white mb-4">
                {tokenDetails.name} ({tokenDetails.symbol})
              </h1>
              <div className="bg-[#2A1F36]/50 p-4 rounded-xl">
                <p className="text-gray-300 text-lg">Token ID: {tokenId}</p>
                <p className="text-gray-300 text-lg">Address: {tokenAddress}</p>
                <p className="text-gray-300 text-lg">Type: {tokenType.toUpperCase()}</p>
              </div>
            </div>

            {/* Token Information Section */}
            <div className="mb-12 relative z-10 max-w-6xl mx-auto">
              <h2 className="font-poppins font-semibold text-2xl md:text-3xl text-white mb-6">Token Information</h2>
              <div className="bg-gradient-to-r from-[#2A1F36]/80 to-[#1E1425]/80 rounded-2xl p-6 shadow-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {staticReadFunctions[tokenType].map((func) => (
                    <ReadCard key={func.name} func={func} />
                  ))}
                </div>
              </div>
            </div>

            {/* Token Actions Section */}
            <div className="mb-12 relative z-10 max-w-6xl mx-auto">
              <h2 className="font-poppins font-semibold text-2xl md:text-3xl text-white mb-6">Token Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {writeFunctions[tokenType]
                  .filter((action) => !action.ownerOnly || isOwner)
                  .map((action) => (
                    <button
                      key={action.name}
                      onClick={() => openModal(action.name)}
                      disabled={isPending}
                      className="p-4 bg-[#1E1425]/80 border border-purple-500/20 rounded-xl text-white text-lg font-medium hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-blue-600/20 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {action.name}
                    </button>
                  ))}
              </div>
            </div>

            {/* Query Token Data Section */}
            <div className="mb-12 relative z-10 max-w-6xl mx-auto">
              <h2 className="font-poppins font-semibold text-2xl md:text-3xl text-white mb-6">Query Token Data</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {queryReadFunctions[tokenType].map((func) => (
                  <ReadCard
                    key={func.name}
                    func={{ name: func.name, label: func.label, args: func.inputLabels.map(() => '') }}
                    isQuery={true}
                    inputLabels={func.inputLabels}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <WriteModal />
      </div>
    </DashboardLayout>
  );
};

export default ManageToken;