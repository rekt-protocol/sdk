import { RektClient } from '@rekt-protocol/sdk';

// Configuration
const CHAIN_ID = 84532; // Target EVM Chain ID (e.g., 8453 for Base, 1 for Ethereum, 84532 for Base Sepolia)
const RPC_URLS = [
  'https://sepolia.base.org',
  'https://base-sepolia-rpc.publicnode.com',
  // 'https://...', // Optional custom provider RPC URL
];
const SPONSOR_PRIVATE_KEY = '0x...' as `0x${string}`; // Sponsor private key funding transaction gas
const COMPROMISED_PRIVATE_KEY = '0x...' as `0x${string}`; // Compromised account private key (used solely for EIP-712 authorization)
const SAFE_RECEIVER_ADDRESS = '0x...' as `0x${string}`; // Secure destination wallet address for rescued assets
const TOKEN_ADDRESS = '0x...' as `0x${string}`; // ERC-20 token contract to rescue (e.g., USDT, USDC)

async function main() {
  // 1. Initialize the REKT SDK with multi-RPC support
  const rekt = await RektClient.create({
    chainId: CHAIN_ID,
    rpcUrls: RPC_URLS,
  });

  // 2. Execute sponsored token rescue atomically with in-flight EIP-7702 delegation
  console.log('Rescuing tokens from compromised wallet...');
  const txHash = await rekt.rescue.executeRescueTokens({
    compromisedPrivateKey: COMPROMISED_PRIVATE_KEY,
    sponsorPrivateKey: SPONSOR_PRIVATE_KEY,
    safeReceiver: SAFE_RECEIVER_ADDRESS,
    tokens: [TOKEN_ADDRESS],
  });

  console.log('Rescue completed! Tx:', txHash);
}

main().catch(console.error);
