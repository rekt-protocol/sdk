import { RektClient } from '@rekt-protocol/sdk';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

/**
 * ============================================================================
 * REKT SDK DEMO: Atomic Claim & Rescue (Standard Mode)
 * ============================================================================
 * 
 * SCENARIO:
 * A compromised wallet is eligible for an valuable airdrop or staking rewards,
 * but cannot claim them directly because automated drainer bots will detect
 * the claimed tokens and instantly transfer them away.
 * 
 * SOLUTION:
 * The REKT Protocol executes both actions atomically in a single transaction:
 * 1. Claims the airdrop from the distributor on behalf of the compromised wallet.
 * 2. Immediately moves the newly received tokens to the clean Safe Receiver wallet.
 * 
 * Because both operations occur in the same Ethereum transaction block,
 * external frontrunning bots have zero opportunity to intercept the tokens.
 * 
 * PARAMETERS EXPLAINED:
 * - sponsorPrivateKey: Pays native gas so the compromised wallet spends 0 ETH.
 * - compromisedAddress: The address eligible for the airdrop.
 * - compromisedPrivateKey: Authorizes the claim and transfer via off-chain EIP-712 permit.
 * - safeReceiver: Secure cold wallet address where claimed funds will be deposited.
 * - claimTarget: Address of the airdrop contract (e.g. Merkle Distributor).
 * - claimCalldata: ABI-encoded payload calling the airdrop contract's claim function.
 * - tokens: Array of ERC-20 addresses that will be received from the claim.
 */

async function main() {
  const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY as `0x${string}`;
  if (!sponsorPrivateKey || !sponsorPrivateKey.startsWith('0x')) {
    console.error('❌ Error: Missing required SPONSOR_PRIVATE_KEY environment variable.');
    console.error('Please configure your private key in .env or run with:');
    console.error('  SPONSOR_PRIVATE_KEY=0x... npx tsx examples/claim-rescue-demo.ts\n');
    process.exit(1);
  }

  console.log('🚀 Initializing REKT Client (Target: Base Sepolia Testnet)...');
  const rekt = await RektClient.create({
    network: 'base-sepolia-testnet',
    rpcUrl: process.env.RPC_URL || 'https://sepolia.base.org',
  });

  // 1. Sponsor Account: Submits transaction and covers network fees
  const sponsorAccount = privateKeyToAccount(sponsorPrivateKey);

  // 2. Safe Receiver: Final destination for the claimed assets
  const safeReceiver = sponsorAccount.address;

  // 3. Compromised Account: Ephemeral keypair simulating an eligible airdrop recipient
  const compromisedPrivateKey = generatePrivateKey();
  const victimAccount = privateKeyToAccount(compromisedPrivateKey);

  // 4. Test Airdrop Parameters (Base Sepolia Demo Airdrop Distributor)
  const airdropContract = '0x3BEB95D673B0132B6b6b00F0B3f8cb8E13ED63Ec' as const;
  const claimCalldata = '0x4e71d92d'; // claim() function selector
  const rewardToken = '0xc0fC9DDA4Ddea31E125979C942E454371785786a' as const; // Test USDT token

  console.log('============================================================');
  console.log('🛡️ REKT ATOMIC CLAIM & RESCUE DEMO');
  console.log('============================================================');
  console.log('Sponsor Address      (Pays Gas)  :', sponsorAccount.address);
  console.log('Compromised Address  (Victim)    :', victimAccount.address);
  console.log('Safe Receiver Address (Recipient):', safeReceiver);
  console.log('Airdrop Contract Address         :', airdropContract);
  console.log('Reward Token Address             :', rewardToken);
  console.log('============================================================\n');

  console.log('⚡ Signing off-chain permit and executing atomic Claim & Rescue...');
  const txHash = await rekt.rescue.executeClaimRescue({
    compromisedAddress: victimAccount.address,
    compromisedPrivateKey,
    sponsorPrivateKey,
    safeReceiver,
    claimTarget: airdropContract,
    claimCalldata,
    tokens: [rewardToken],
  });

  console.log('✓ Transaction broadcasted successfully!');
  console.log(`✓ Explorer Link: https://sepolia.basescan.org/tx/${txHash}`);
  console.log('\n🎉 Airdrop claimed and rescued into safe cold wallet in a single block!');
}

main().catch((error) => {
  console.error('Fatal execution error:', error);
  process.exit(1);
});
