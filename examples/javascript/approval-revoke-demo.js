import { RektClient } from '@rekt-protocol/sdk';
import { privateKeyToAccount } from 'viem/accounts';

// Config
const CHAIN_ID = 84532; // Target EVM Chain ID (e.g. 8453 for Base, 1 for Ethereum, 84532 for Base Sepolia)
const RPC_URLS = [
  'https://sepolia.base.org',
  'https://base-sepolia-rpc.publicnode.com',
  // 'https://...', // Add custom Alchemy/Infura RPC
];
const OWNER_PRIVATE_KEY = '0x...'; // Token owner private key signing the revocation
const TOKEN_ADDRESS = '0x...'; // ERC-20 token contract with active approval
const SPENDER_ADDRESS = '0x...'; // Contract to revoke allowance from (e.g. malicious spender)

async function main() {
  const owner = privateKeyToAccount(OWNER_PRIVATE_KEY);

  // 1. Initialize SDK (auto-shuffles multiple RPCs and fails over on error)
  const rekt = await RektClient.create({
    chainId: CHAIN_ID,
    rpcUrls: RPC_URLS,
  });

  // 2. Scan active token allowances
  console.log(`Scanning allowances for ${owner.address}...`);
  const result = await rekt.approvals.scanApprovals(
    owner.address,
    [TOKEN_ADDRESS],
    [{ address: SPENDER_ADDRESS, label: 'Target Spender' }]
  );
  console.log(`Found ${result.approvals.length} active allowance(s):`, result.approvals);

  // 3. Revoke allowance back to 0
  console.log('\nRevoking allowance...');
  const txHash = await rekt.approvals.executeDirectRevoke({
    tokenAddress: TOKEN_ADDRESS,
    spenderAddress: SPENDER_ADDRESS,
    ownerPrivateKey: OWNER_PRIVATE_KEY,
  });

  console.log('Revocation confirmed! Tx:', txHash);
}

main().catch(console.error);
