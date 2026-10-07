import { RektClient } from '@rekt-protocol/sdk';
import { privateKeyToAccount } from 'viem/accounts';

// Configuration
const CHAIN_ID = 84532; // Target EVM Chain ID (e.g., 8453 for Base, 1 for Ethereum, 84532 for Base Sepolia)
const RPC_URLS = [
  'https://sepolia.base.org',
  'https://base-sepolia-rpc.publicnode.com',
  // 'https://...', // Optional custom provider RPC URL
];
const OWNER_PRIVATE_KEY = '0x...' as `0x${string}`; // Token owner private key executing the revocation
const TOKEN_ADDRESS = '0x...' as `0x${string}`; // ERC-20 token contract with active allowance
const SPENDER_ADDRESS = '0x...' as `0x${string}`; // Spender contract address to revoke allowance from

async function main() {
  const owner = privateKeyToAccount(OWNER_PRIVATE_KEY);

  // 1. Initialize the REKT SDK with multi-RPC support
  const rekt = await RektClient.create({
    chainId: CHAIN_ID,
    rpcUrls: RPC_URLS,
  });

  // 2. Query active token allowances for the owner account
  console.log(`Scanning allowances for ${owner.address}...`);
  const result = await rekt.approvals.scanApprovals(
    owner.address,
    [TOKEN_ADDRESS],
    [{ address: SPENDER_ADDRESS, label: 'Target Spender' }]
  );
  console.log(`Found ${result.approvals.length} active allowance(s):`, result.approvals);

  // 3. Reset allowance to 0 (direct on-chain revocation)
  console.log('\nRevoking allowance...');
  const txHash = await rekt.approvals.executeDirectRevoke({
    tokenAddress: TOKEN_ADDRESS,
    spenderAddress: SPENDER_ADDRESS,
    ownerPrivateKey: OWNER_PRIVATE_KEY,
  });

  console.log('Revocation confirmed! Tx:', txHash);
}

main().catch(console.error);
