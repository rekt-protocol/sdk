import { RektClient } from '@rekt-protocol/sdk';
import { privateKeyToAccount } from 'viem/accounts';

// Config
const CHAIN_ID = 84532; // Target EVM Chain ID (e.g. 8453 for Base, 1 for Ethereum, 84532 for Base Sepolia)
const RPC_URLS = [
  'https://sepolia.base.org',
  'https://base-sepolia-rpc.publicnode.com',
  // 'https://...', // Add custom Alchemy/Infura RPC
];
const SPONSOR_PRIVATE_KEY = '0x...' as `0x${string}`; // Clean wallet paying transaction gas fees (ETH)
const COMPROMISED_PRIVATE_KEY = '0x...' as `0x${string}`; // Hacked wallet private key (used ONLY for off-chain permit signature)
const SAFE_RECEIVER_ADDRESS = '0x...' as `0x${string}`; // Clean cold wallet destination for rescued assets
const AIRDROP_CONTRACT_ADDRESS = '0x...' as `0x${string}`; // Airdrop distributor contract to claim from
const CLAIM_CALLDATA = '0x4e71d92d' as const; // ABI-encoded claim() payload
const REWARD_TOKEN_ADDRESS = '0x...' as `0x${string}`; // ERC-20 token contract released by the airdrop

async function main() {
  const compromisedAccount = privateKeyToAccount(COMPROMISED_PRIVATE_KEY);

  // 1. Initialize SDK (auto-shuffles multiple RPCs and fails over on error)
  const rekt = await RektClient.create({
    chainId: CHAIN_ID,
    rpcUrls: RPC_URLS,
  });

  // 2. Atomically claim airdrop & transfer directly to safe cold wallet
  console.log('Executing atomic claim and rescue...');
  const txHash = await rekt.rescue.executeClaimRescue({
    compromisedAddress: compromisedAccount.address,
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
