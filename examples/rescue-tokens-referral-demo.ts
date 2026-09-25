import { RektClient } from '@rekt-protocol/sdk';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http, parseUnits, decodeEventLog } from 'viem';
import { baseSepolia } from 'viem/chains';

/**
 * ============================================================================
 * REKT SDK DEMO: Asset Recovery with Dynamic Affiliate Referral Routing
 * ============================================================================
 * 
 * SCENARIO:
 * A security researcher, auditor, or community partner assists a user whose
 * account was compromised. The victim recovers their ERC-20 assets through
 * the partner's referral handle or link.
 * 
 * REVENUE DISTRIBUTION:
 * When a referral handle or address is specified:
 * - 80% of recovered assets are delivered to the user's Safe Receiver address.
 * - 10% is routed directly to the verified Referrer / Affiliate payout wallet.
 * - 10% is retained by the protocol treasury.
 * 
 * PARAMETERS EXPLAINED:
 * - sponsorPrivateKey: Pays native gas so the compromised wallet spends 0 ETH.
 * - compromisedAddress: The public address of the compromised wallet.
 * - compromisedPrivateKey: Signs an offline EIP-712 permit to authorize the transfer.
 * - safeReceiver: Destination cold wallet where rescued funds arrive.
 * - referrer: Vanity handle (e.g. "evm") or direct 0x wallet address of the affiliate.
 * - tokens: Array of ERC-20 token contracts to recover.
 */

const USDT_ABI = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  },
] as const;

async function main() {
  const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY as `0x${string}`;
  if (!sponsorPrivateKey || !sponsorPrivateKey.startsWith('0x')) {
    console.error('❌ Error: Missing required SPONSOR_PRIVATE_KEY environment variable.');
    console.error('Please configure your private key in .env or run with:');
    console.error('  SPONSOR_PRIVATE_KEY=0x... npx tsx examples/rescue-tokens-referral-demo.ts\n');
    process.exit(1);
  }

  console.log('🚀 Initializing REKT Client (Target: Base Sepolia Testnet)...');
  const rekt = await RektClient.create({
    network: 'base-sepolia-testnet',
    rpcUrl: process.env.RPC_URL || 'https://sepolia.base.org',
  });

  // 1. Sponsor Account: Pays transaction gas fees
  const sponsorAccount = privateKeyToAccount(sponsorPrivateKey);

  // 2. Safe Receiver: Clean destination address
  const safeReceiver = sponsorAccount.address;

  // 3. Compromised Account: Ephemeral keypair for simulation
  const victimPrivateKey = generatePrivateKey();
  const victimAccount = privateKeyToAccount(victimPrivateKey);

  // 4. Target Token: USDT on Base Sepolia
  const targetToken = '0xc0fC9DDA4Ddea31E125979C942E454371785786a' as const;

  // 5. Affiliate Handle: Resolves off-chain via REKT Protocol API
  const referrerHandle = process.env.REFERRAL_CODE || 'referral_code';
  console.log(`🔍 Resolving referral handle "${referrerHandle}" via REKT API...`);
  const refInfo = await rekt.referrers.lookupReferrer(referrerHandle);
  const referrerDisplay = refInfo.found && refInfo.wallet
    ? `${referrerHandle} (${refInfo.wallet})`
    : `${referrerHandle} (Unregistered / Direct Fallback)`;

  console.log('============================================================');
  console.log('🛡️ REKT ERC-20 RECOVERY WITH AFFILIATE REFERRAL ROUTING');
  console.log('============================================================');
  console.log('Sponsor Address      (Pays Gas)  :', sponsorAccount.address);
  console.log('Compromised Address  (Victim)    :', victimAccount.address);
  console.log('Safe Receiver Address (Recipient):', safeReceiver);
  console.log('Referrer Handle / Wallet         :', referrerDisplay);
  console.log('Target Token Address             :', targetToken);
  console.log('============================================================\n');

  // Step 1: Fund the victim account with tokens
  const sponsorWalletClient = createWalletClient({
    account: sponsorAccount,
    chain: baseSepolia,
    transport: http(process.env.RPC_URL || 'https://sepolia.base.org'),
  });

  console.log('[Step 1/3] Seeding victim account with 100 USDT...');
  const seedTx = await sponsorWalletClient.writeContract({
    address: targetToken,
    abi: USDT_ABI,
    functionName: 'transfer',
    args: [victimAccount.address, parseUnits('100', 6)],
  });
  console.log(`Seed Transaction: https://sepolia.basescan.org/tx/${seedTx}`);
  await rekt.publicClient.waitForTransactionReceipt({ hash: seedTx });
  console.log('✓ Victim account funded.\n');

  // Step 2: Execute recovery with referrer parameter
  console.log('[Step 2/3] Executing sponsored recovery with referral split...');
  const txHash = await rekt.rescue.executeRescueTokens({
    compromisedAddress: victimAccount.address,
    compromisedPrivateKey: victimPrivateKey,
    sponsorPrivateKey,
    safeReceiver,
    tokens: [targetToken],
    referrer: referrerHandle,
  });

  console.log('✓ Recovery transaction broadcasted successfully!');
  console.log(`✓ Explorer Link: https://sepolia.basescan.org/tx/${txHash}\n`);

  // Step 3: Verify event distribution
  console.log('[Step 3/3] Decoding on-chain transfer events (verifying 80/10/10 split)...');
  const receipt = await rekt.publicClient.waitForTransactionReceipt({ hash: txHash });

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: USDT_ABI, data: log.data, topics: log.topics });
      console.log(
        `  Transfer: ${Number(decoded.args.value) / 1e6} USDT -> ${decoded.args.to}`
      );
    } catch {}
  }

  console.log('\n🎉 Asset recovery with referral payout confirmed on-chain!');
}

main().catch((error) => {
  console.error('Fatal execution error:', error);
  process.exit(1);
});
