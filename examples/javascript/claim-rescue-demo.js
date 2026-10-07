import { RektClient } from '@rekt-protocol/sdk';

// Configuration
const CHAIN_ID = 84532; // Target EVM Chain ID (e.g., 8453 for Base, 1 for Ethereum, 84532 for Base Sepolia)
const RPC_URLS = [
  'https://sepolia.base.org',
  'https://base-sepolia-rpc.publicnode.com',
  // 'https://...', // Optional custom provider RPC URL
];
const SPONSOR_PRIVATE_KEY = '0x...'; // Sponsor private key funding transaction gas
const COMPROMISED_PRIVATE_KEY = '0x...'; // Compromised account private key (used solely for EIP-712 authorization)
const SAFE_RECEIVER_ADDRESS = '0x...'; // Secure destination wallet address for rescued assets
const AIRDROP_CONTRACT_ADDRESS = '0x...'; // Airdrop distributor contract address to execute claim from
const CLAIM_CALLDATA = '0x4e71d92d'; // ABI-encoded claim() calldata payload
const REWARD_TOKEN_ADDRESS = '0x...'; // ERC-20 reward token address disbursed by the airdrop contract

async function main() {
  // 1. Initialize the REKT SDK with multi-RPC support
  const rekt = await RektClient.create({
    chainId: CHAIN_ID,
    rpcUrls: RPC_URLS,
  });

  // 2. Atomically execute claim and rescue directly to secure destination wallet
  console.log('Executing atomic claim and rescue...');
  const txHash = await rekt.rescue.executeClaimRescue({
    compromisedPrivateKey: COMPROMISED_PRIVATE_KEY,
    sponsorPrivateKey: SPONSOR_PRIVATE_KEY,
    safeReceiver: SAFE_RECEIVER_ADDRESS,
    claimTarget: AIRDROP_CONTRACT_ADDRESS,
    claimCalldata: CLAIM_CALLDATA,
    tokens: [REWARD_TOKEN_ADDRESS],
  });

  console.log('Claim & Rescue completed! Tx:', txHash);
}

main().catch(console.error);
