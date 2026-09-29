import { RektClient } from '@rekt-protocol/sdk';

// Config
const CHAIN_ID = 84532; // Target EVM Chain ID (e.g. 8453 for Base, 1 for Ethereum, 84532 for Base Sepolia)
const RPC_URLS = [
  'https://sepolia.base.org',
  'https://base-sepolia-rpc.publicnode.com',
  // 'https://...', // Add custom Alchemy/Infura RPC
];
const TARGET_ACCOUNT_ADDRESS = '0x...'; // Account to audit for active permits & nonces
const TOKEN_ADDRESS = '0x...'; // ERC-20 token to check for EIP-2612 / Permit2 support

async function main() {
  // 1. Initialize SDK (auto-shuffles multiple RPCs and fails over on error)
  const rekt = await RektClient.create({
    chainId: CHAIN_ID,
    rpcUrls: RPC_URLS,
  });

  // 2. Audit off-chain permit support and current nonce
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
