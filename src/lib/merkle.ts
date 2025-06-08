import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import Papa from 'papaparse';
import { ethers } from 'ethers';

export interface Recipient {
  address: string;
}

export interface RecipientWithProof extends Recipient {
  proof: string[];
}

export function createMerkleTree(recipients: Recipient[]): {
  merkleTree: MerkleTree;
  merkleRoot: string;
  proofs: { [address: string]: string[] };
  recipientsWithProof: RecipientWithProof[];
} {
  const normalizedRecipients = recipients
    .filter((recipient) => recipient.address && ethers.isAddress(recipient.address))
    .map((recipient) => ({
      address: recipient.address.toLowerCase().trim(),
    }));

  if (normalizedRecipients.length === 0) {
    throw new Error('No valid addresses found in recipient list');
  }

  const leaves = normalizedRecipients.map((recipient) => keccak256(recipient.address));

  console.log('🔍 Normalized Addresses:');
  normalizedRecipients.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.address}`);
  });

  console.log('🔢 Leaves (hashed addresses):');
  leaves.forEach((leaf, i) => {
    console.log(`  Leaf ${i + 1}: ${leaf.toString('hex')}`);
  });

  const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const merkleRoot = merkleTree.getHexRoot();

  console.log('🌳 Generated Merkle Root:', merkleRoot);

  const proofs: { [address: string]: string[] } = {};
  const recipientsWithProof: RecipientWithProof[] = [];

  normalizedRecipients.forEach((recipient) => {
    const leaf = keccak256(recipient.address);
    const proof = merkleTree.getHexProof(leaf);
    proofs[recipient.address] = proof;

    const isValid = merkleTree.verify(proof, leaf, merkleRoot);
    console.log(`🧾 Proof for ${recipient.address}:`, proof);
    console.log(`✅ Proof valid for ${recipient.address}?`, isValid);

    if (!isValid) {
      console.error('❌ WARNING: Invalid proof generated for', recipient.address);
    }

    recipientsWithProof.push({
      address: recipient.address,
      proof,
    });
  });

  return {
    merkleTree,
    merkleRoot,
    proofs,
    recipientsWithProof,
  };
}

export async function parseCSV(file: File): Promise<Recipient[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      delimitersToGuess: [',', '\t', '|', ';'],
      complete: (result) => {
        if (result.errors && result.errors.length > 0) {
          console.warn('CSV parsing warnings:', result.errors);
        }

        const recipients: Recipient[] = [];
        const data = result.data as Array<Record<string, unknown>>;

        if (data.length === 0) {
          reject(new Error('CSV file is empty'));
          return;
        }

        const firstRow = data[0];
        const availableColumns = Object.keys(firstRow).map(key => key.trim().toLowerCase());
        console.log('Available CSV columns:', availableColumns);

        const addressColumnNames = ['address', 'wallet', 'walletaddress', 'wallet_address', 'addr', 'recipient'];
        const addressColumn = availableColumns.find(col =>
          addressColumnNames.some(name => col.includes(name))
        );

        if (!addressColumn) {
          reject(new Error(`No address column found. Expected one of: ${addressColumnNames.join(', ')}. Found columns: ${availableColumns.join(', ')}`));
          return;
        }

        console.log(`Using column '${addressColumn}' for addresses`);

        for (const row of data) {
          let addressValue: string | undefined;

          for (const [key, value] of Object.entries(row)) {
            if (key.trim().toLowerCase() === addressColumn) {
              addressValue = value as string;
              break;
            }
          }

          if (!addressValue) {
            console.warn('Skipping row with no address value:', row);
            continue;
          }

          const address = String(addressValue).trim();
          if (!address) {
            console.warn('Skipping row with empty address');
            continue;
          }

          if (!ethers.isAddress(address)) {
            console.warn(`Invalid address skipped: ${address}`);
            continue;
          }

          recipients.push({ address });
        }

        if (recipients.length === 0) {
          reject(new Error('No valid Ethereum addresses found in CSV. Please check that your addresses are valid and in the correct format (0x...).'));
          return;
        }

        console.log(`✅ Parsed ${recipients.length} valid recipients from CSV`);
        resolve(recipients);
      },
      error: (error) => {
        console.error('CSV parse error:', error);
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      },
    });
  });
}

// ✅ FIXED: Proper verification using the real Merkle Tree
export function verifyAddressEligibility(
  address: string,
  recipientsWithProof: RecipientWithProof[],
  merkleTree: MerkleTree,
  merkleRoot: string,
): { eligible: boolean; proof?: string[] } {
  const normalizedAddress = address.toLowerCase().trim();
  const recipient = recipientsWithProof.find((r) => r.address === normalizedAddress);

  if (!recipient) {
    return { eligible: false };
  }

  const leaf = keccak256(normalizedAddress);
  const isValid = merkleTree.verify(recipient.proof, leaf, merkleRoot);

  console.log('🔍 Verifying:', normalizedAddress);
  console.log('🌿 Leaf:', leaf.toString('hex'));
  console.log('📜 Proof:', recipient.proof);
  console.log('🔗 Root:', merkleRoot);
  console.log('✅ Is Valid?', isValid);

  return {
    eligible: isValid,
    proof: isValid ? recipient.proof : undefined,
  };
}
