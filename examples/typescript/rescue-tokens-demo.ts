import { RektClient } from '@rekt-protocol/sdk';
import { privateKeyToAccount } from 'viem/accounts';

// Config
const CHAIN_ID = 84532; // Base Sepolia Testnet (e.g. 1 for Ethereum, 8453 for Base, 56 for BSC, etc.)
const RPC_URLS = [
  'https://sepolia.base.org',
  'https://base-sepolia-rpc.publicnode.com',
  // 'https://...', // Add custom Alchemy/Infura RPC
];
const SPONSOR_PRIVATE_KEY = '0x...' as `0x${string}`; // Clean wallet paying transaction gas fees (ETH)
const COMPROMISED_PRIVATE_KEY = '0x...' as `0x${string}`; // Hacked wallet private key (used ONLY for off-chain permit signature)
const SAFE_RECEIVER_ADDRESS = '0x...' as `0x${string}`; // Clean cold wallet destination for rescued assets
const TOKEN_ADDRESS = '0x...' as `0x${string}`; // ERC-20 token to rescue (e.g. USDT, USDC)

async function main() {
  const compromisedAccount = privateKeyToAccount(COMPROMISED_PRIVATE_KEY);

  // 1. Initialize SDK (auto-shuffles multiple RPCs and fails over on error)
  const rekt = await RektClient.create({
    chainId: CHAIN_ID,
    rpcUrls: RPC_URLS,
  });

  // 2. Execute sponsored token rescue
  console.log(`Rescuing tokens from compromised wallet ${compromisedAccount.address}...`);
  const txHash = await rekt.rescue.executeRescueTokens({
    compromisedAddress: compromisedAccount.address,
    compromisedPrivateKey: COMPROMISED_PRIVATE_KEY,
    sponsorPrivateKey: SPONSOR_PRIVATE_KEY,
    safeReceiver: SAFE_RECEIVER_ADDRESS,
    tokens: [TOKEN_ADDRESS],
  });

  console.log('Rescue completed! Tx:', txHash);
}

main().catch(console.error);
