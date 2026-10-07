import { RektClient } from '@rekt-protocol/sdk';

// Configuration
const CHAIN_ID = 84532; // Target EVM Chain ID (e.g., 8453 for Base, 1 for Ethereum, 84532 for Base Sepolia)
const RPC_URLS = [
  'https://sepolia.base.org',
  'https://base-sepolia-rpc.publicnode.com',
  // 'https://...', // Optional custom provider RPC URL
];
const TARGET_ACCOUNT_ADDRESS = '0x...'; // Target account address to audit for active permits and nonces
const TOKEN_ADDRESS = '0x...'; // ERC-20 token address to inspect for EIP-2612 or Permit2 support

async function main() {
  // 1. Initialize the REKT SDK with multi-RPC support
  const rekt = await RektClient.create({
    chainId: CHAIN_ID,
    rpcUrls: RPC_URLS,
  });

  // 2. Audit off-chain permit capability, specification standard, and active nonce
  console.log(`Auditing permit support for account ${TARGET_ACCOUNT_ADDRESS}...`);
  const permit = await rekt.permits.inspectPermit(TOKEN_ADDRESS, TARGET_ACCOUNT_ADDRESS);

  console.log({
    token: `${permit.tokenName} (${permit.tokenSymbol})`,
    supportsPermit: permit.supportsPermit,
    standard: permit.standard,
    currentNonce: permit.currentNonce.toString(),
    domainSeparator: permit.domainSeparator,
  });
}

main().catch(console.error);
