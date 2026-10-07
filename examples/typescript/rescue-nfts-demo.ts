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
const NFT_COLLECTION_ADDRESS = '0x...' as `0x${string}`; // NFT collection contract address (ERC-721 or ERC-1155)
const TOKEN_ID = 1n; // Token ID to rescue

async function main() {
  // 1. Initialize the REKT SDK with multi-RPC support
  const rekt = await RektClient.create({
    chainId: CHAIN_ID,
    rpcUrls: RPC_URLS,
  });

  // 2. Perform pre-flight simulation (optional verification prior to broadcast)
  // Hybrid Smart Auto-Detect: queries on-chain EIP-165 interfaces to identify ERC-721 or ERC-1155
  console.log('Simulating NFT rescue with Hybrid Smart Auto-Detect...');
  await rekt.rescue.simulateRescueNfts({
    compromisedPrivateKey: COMPROMISED_PRIVATE_KEY,
    sponsorAddress: '0xSponsorAddress...' as `0x${string}`,
    safeReceiver: SAFE_RECEIVER_ADDRESS,
    tokens: [NFT_COLLECTION_ADDRESS],
    tokenIds: [TOKEN_ID],
    // Optional configuration:
    // standard: 'auto', // 'auto' (default: EIP-165 detected) | 'erc721' | 'erc1155'
    // amounts: [1n],     // Optional for ERC-1155: queries on-chain balanceOf automatically if omitted
  });

  // 3. Execute sponsored NFT rescue atomically with in-flight EIP-7702 delegation
  console.log('Rescuing NFTs from compromised wallet...');
  const txHash = await rekt.rescue.executeRescueNfts({
    compromisedPrivateKey: COMPROMISED_PRIVATE_KEY,
    sponsorPrivateKey: SPONSOR_PRIVATE_KEY,
    safeReceiver: SAFE_RECEIVER_ADDRESS,
    tokens: [NFT_COLLECTION_ADDRESS],
    tokenIds: [TOKEN_ID],
    // Automatically routes to secureERC721 or secureERC1155 based on the detected token standard
  });

  console.log('NFT Rescue completed! Tx:', txHash);
}

main().catch(console.error);
