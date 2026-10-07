import { RektClient } from '@rekt-protocol/sdk';
import { privateKeyToAccount } from 'viem/accounts';

// Configuration
const CHAIN_ID = 84532; // Target EVM Chain ID (e.g., 8453 for Base, 1 for Ethereum, 84532 for Base Sepolia)
const RPC_URLS = [
  'https://sepolia.base.org',
  'https://base-sepolia-rpc.publicnode.com',
  // 'https://...', // Optional custom provider RPC URL
];
const SPONSOR_PRIVATE_KEY = '0x...' as `0x${string}`; // Sponsor private key funding transaction gas
const COMPROMISED_PRIVATE_KEY = '0x...' as `0x${string}`; // Compromised account private key to inspect and remediate

async function main() {
  const compromisedAccount = privateKeyToAccount(COMPROMISED_PRIVATE_KEY);

  // 1. Initialize the REKT SDK with multi-RPC support
  const rekt = await RektClient.create({
    chainId: CHAIN_ID,
    rpcUrls: RPC_URLS,
  });

  // 2. Audit account for active EIP-7702 code delegation
  console.log(`Inspecting EIP-7702 delegation for ${compromisedAccount.address}...`);
  const status = await rekt.eip7702.inspectDelegation(compromisedAccount.address);
  console.log('Active Delegation:', status.hasDelegation ? `YES -> ${status.delegatedTarget}` : 'NO (Clean EOA)');

  // 3. Neutralize delegation (sponsored transaction resets delegated bytecode back to address(0))
  console.log('\nNeutralizing account delegation...');
  const txHash = await rekt.eip7702.neutralizeDelegation({
    accountPrivateKey: COMPROMISED_PRIVATE_KEY,
    sponsorPrivateKey: SPONSOR_PRIVATE_KEY,
  });

  console.log('Neutralized! Tx:', txHash);
}

main().catch(console.error);
