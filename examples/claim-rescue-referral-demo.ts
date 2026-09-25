import { RektClient } from '@rekt-protocol/sdk';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

/**
 * ============================================================================
 * REKT SDK DEMO: Atomic Claim & Rescue with Affiliate Referral Routing
 * ============================================================================
 * 
 * SCENARIO:
 * An airdrop recipient uses an affiliate's referral link to claim their rewards
 * securely without exposing their compromised wallet to frontrunning drainer bots.
 * 
 * WORKFLOW:
 * 1. The SDK resolves the affiliate's vanity handle via the REKT Protocol API.
 * 2. An atomic transaction calls the airdrop contract to claim tokens.
 * 3. The newly claimed tokens are automatically split: 80% to Safe Receiver,
 *    10% to Affiliate Payout Wallet, and 10% to Protocol Treasury.
 * 
 * PARAMETERS EXPLAINED:
 * - sponsorPrivateKey: Gas relayer private key.
 * - compromisedAddress: Account eligible for rewards.
 * - compromisedPrivateKey: Signs EIP-712 permit to authorize claim and routing.
 * - safeReceiver: Clean cold wallet destination for 80% of assets.
 * - claimTarget: Address of the airdrop distributor contract.
 * - claimCalldata: ABI-encoded claim payload.
 * - tokens: Array of token contracts released by the claim.
 * - referrer: Affiliate username (e.g. "evm") or wallet address.
 */

async function main() {
  const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY as `0x${string}`;
  if (!sponsorPrivateKey || !sponsorPrivateKey.startsWith('0x')) {
    console.error('❌ Error: Missing required SPONSOR_PRIVATE_KEY environment variable.');
    console.error('Please configure your private key in .env or run with:');
    console.error('  SPONSOR_PRIVATE_KEY=0x... npx tsx examples/claim-rescue-referral-demo.ts\n');
    process.exit(1);
  }

  console.log('🚀 Initializing REKT Client (Target: Base Sepolia Testnet)...');
  const rekt = await RektClient.create({
    network: 'base-sepolia-testnet',
    rpcUrl: process.env.RPC_URL || 'https://sepolia.base.org',
  });

  // 1. Sponsor Account: Covers network gas costs
  const sponsorAccount = privateKeyToAccount(sponsorPrivateKey);

  // 2. Safe Receiver: Clean destination address
  const safeReceiver = sponsorAccount.address;

  // 3. Compromised Account: Ephemeral keypair for simulation
  const compromisedPrivateKey = generatePrivateKey();
  const victimAccount = privateKeyToAccount(compromisedPrivateKey);

  // 4. Resolve Affiliate Handle
  const referrerHandle = process.env.REFERRAL_CODE || 'referral_code';
  console.log(`🔍 Resolving referral handle "${referrerHandle}" via REKT API...`);
  const refInfo = await rekt.referrers.lookupReferrer(referrerHandle);
  const referrerDisplay = refInfo.found && refInfo.wallet
    ? `${referrerHandle} (${refInfo.wallet})`
    : `${referrerHandle} (Unregistered / Direct Fallback)`;

  // 5. Test Airdrop Parameters
  const airdropContract = '0x3BEB95D673B0132B6b6b00F0B3f8cb8E13ED63Ec' as const;
  const claimCalldata = '0x4e71d92d'; // claim() function selector
  const rewardToken = '0xc0fC9DDA4Ddea31E125979C942E454371785786a' as const; // Test USDT token

  console.log('============================================================');
  console.log('🛡️ REKT ATOMIC CLAIM & RESCUE WITH REFERRAL ROUTING');
  console.log('============================================================');
  console.log('Sponsor Address      (Pays Gas)  :', sponsorAccount.address);
  console.log('Compromised Address  (Victim)    :', victimAccount.address);
  console.log('Safe Receiver Address (Recipient):', safeReceiver);
  console.log('Referrer Handle / Wallet         :', referrerDisplay);
  console.log('Airdrop Contract Address         :', airdropContract);
  console.log('Reward Token Address             :', rewardToken);
  console.log('============================================================\n');

  console.log('⚡ Signing permit & broadcasting atomic Claim & Rescue...');
  const txHash = await rekt.rescue.executeClaimRescue({
    compromisedAddress: victimAccount.address,
    compromisedPrivateKey,
    sponsorPrivateKey,
    safeReceiver,
    claimTarget: airdropContract,
    claimCalldata,
    tokens: [rewardToken],
    referrer: referrerHandle,
  });

  console.log('✓ Transaction broadcasted successfully!');
  console.log(`✓ Explorer Link: https://sepolia.basescan.org/tx/${txHash}`);
  console.log('\n🎉 Tokens claimed, rescued, and referral fees routed automatically in 1 block!');
}

main().catch((error) => {
  console.error('Fatal execution error:', error);
  process.exit(1);
});
