import { RektClient } from '@rekt-protocol/sdk';
import { privateKeyToAccount } from 'viem/accounts';

// Config
const CHAIN_ID = 84532; // Target EVM Chain ID (e.g. 8453 for Base, 1 for Ethereum, 84532 for Base Sepolia)
const RPC_URLS = [
  'https://sepolia.base.org',
  'https://base-sepolia-rpc.publicnode.com',
  // 'https://...', // Add custom Alchemy/Infura RPC
];
const SPONSOR_PRIVATE_KEY = '0x...'; // Clean wallet paying transaction gas fees (ETH)
const COMPROMISED_PRIVATE_KEY = '0x...'; // Account to inspect & neutralize malicious delegation for

async function main() {
  const compromisedAccount = privateKeyToAccount(COMPROMISED_PRIVATE_KEY);

  // 1. Initialize SDK (auto-shuffles multiple RPCs and fails over on error)
  const rekt = await RektClient.create({
    chainId: CHAIN_ID,
    rpcUrls: RPC_URLS,
  });

  // 2. Inspect account for malicious EIP-7702 delegation
  console.log(`Inspecting EIP-7702 delegation for ${compromisedAccount.address}...`);
  const status = await rekt.eip7702.inspectDelegation(compromisedAccount.address);
  console.log('Active Delegation:', status.hasDelegation ? `YES -> ${status.delegatedTarget}` : 'NO (Clean EOA)');

  // 3. Neutralize delegation (sponsored gas resets bytecode back to address(0))
  console.log('\nNeutralizing account delegation...');
  const txHash = await rekt.eip7702.neutralizeDelegation({
    accountPrivateKey: COMPROMISED_PRIVATE_KEY,
    sponsorPrivateKey: SPONSOR_PRIVATE_KEY,
  });

  console.log('Neutralized! Tx:', txHash);
}

main().catch(console.error);
