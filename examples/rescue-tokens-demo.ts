import { RektClient } from '@rekt-protocol/sdk';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http, parseUnits, decodeEventLog } from 'viem';
import { baseSepolia } from 'viem/chains';

/**
 * ============================================================================
 * REKT SDK DEMO: Direct ERC-20 Asset Recovery (Standard Mode)
 * ============================================================================
 * 
 * SCNENARIO:
 * A compromised wallet holds ERC-20 tokens (e.g. USDT) but has 0 native gas.
 * If the user deposits ETH into the compromised wallet, automated drainers
 * will immediately steal the gas.
 * 
 * SOLUTION:
 * The REKT Protocol allows a separate "Sponsor" wallet (which has ETH) to pay
 * the network gas on behalf of the victim. The compromised account signs an
 * off-chain EIP-712 permit (zero gas required), authorizing the contract to
 * transfer the tokens directly to a clean "Safe Receiver" address.
 * 
 * PARAMETERS EXPLAINED:
 * - sponsorPrivateKey: The private key of the account paying the transaction gas.
 * - compromisedAddress: The public address of the compromised/hacked wallet.
 * - compromisedPrivateKey: The private key used ONLY to sign the offline authorization.
 * - safeReceiver: The uncompromised cold wallet destination for recovered tokens.
 * - tokens: Array of ERC-20 contract addresses to rescue in a single atomic batch.
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
  // Validate that the sponsor private key is provided via environment variable
  const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY as `0x${string}`;
  if (!sponsorPrivateKey || !sponsorPrivateKey.startsWith('0x')) {
    console.error('❌ Error: Missing required SPONSOR_PRIVATE_KEY environment variable.');
    console.error('Please configure your private key in .env or run with:');
    console.error('  SPONSOR_PRIVATE_KEY=0x... npx tsx examples/rescue-tokens-demo.ts\n');
    process.exit(1);
  }

  console.log('🚀 Initializing REKT Client (Target: Base Sepolia Testnet)...');
  const rekt = await RektClient.create({
    network: 'base-sepolia-testnet',
    rpcUrl: process.env.RPC_URL || 'https://sepolia.base.org',
  });

  // 1. Sponsor Account: Pays transaction gas fees
  const sponsorAccount = privateKeyToAccount(sponsorPrivateKey);

  // 2. Safe Receiver: Clean destination address (set to sponsor wallet for demo)
  const safeReceiver = sponsorAccount.address;

  // 3. Compromised Account: Ephemeral keypair generated on-the-fly for this demonstration
  const victimPrivateKey = generatePrivateKey();
  const victimAccount = privateKeyToAccount(victimPrivateKey);

  // 4. Target Token: USDT on Base Sepolia
  const targetToken = '0xc0fC9DDA4Ddea31E125979C942E454371785786a' as const;

  console.log('============================================================');
  console.log('🛡️ REKT ERC-20 ASSET RECOVERY DEMO');
  console.log('============================================================');
  console.log('Sponsor Address      (Pays Gas)  :', sponsorAccount.address);
  console.log('Compromised Address  (Victim)    :', victimAccount.address);
  console.log('Safe Receiver Address (Recipient):', safeReceiver);
  console.log('Target Token Address             :', targetToken);
  console.log('============================================================\n');

  // Step 1: Simulate existing tokens by seeding the victim account from sponsor
  const sponsorWalletClient = createWalletClient({
    account: sponsorAccount,
    chain: baseSepolia,
    transport: http(process.env.RPC_URL || 'https://sepolia.base.org'),
  });

  console.log('[Step 1/3] Seeding victim account with 100 USDT (simulating held assets)...');
  const seedTx = await sponsorWalletClient.writeContract({
    address: targetToken,
    abi: USDT_ABI,
    functionName: 'transfer',
    args: [victimAccount.address, parseUnits('100', 6)],
  });
  console.log(`Seed Transaction Sent: https://sepolia.basescan.org/tx/${seedTx}`);
  await rekt.publicClient.waitForTransactionReceipt({ hash: seedTx });
  console.log('✓ Victim account successfully funded with 100 USDT.\n');

  // Step 2: Execute sponsored token recovery
  console.log('[Step 2/3] Executing sponsored token recovery via REKT Protocol...');
  const txHash = await rekt.rescue.executeRescueTokens({
    compromisedAddress: victimAccount.address,
    compromisedPrivateKey: victimPrivateKey,
    sponsorPrivateKey,
    safeReceiver,
    tokens: [targetToken],
  });

  console.log('✓ Transaction broadcasted successfully!');
  console.log(`✓ Explorer Link: https://sepolia.basescan.org/tx/${txHash}\n`);

  // Step 3: Verify on-chain transfer events
  console.log('[Step 3/3] Awaiting transaction confirmation and decoding events...');
  const receipt = await rekt.publicClient.waitForTransactionReceipt({ hash: txHash });

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: USDT_ABI, data: log.data, topics: log.topics });
      console.log(
        `  Transfer Event: ${Number(decoded.args.value) / 1e6} USDT transferred to ${decoded.args.to}`
      );
    } catch {}
  }

  console.log('\n🎉 Asset recovery completed successfully with zero gas on victim account!');
}

main().catch((error) => {
  console.error('Fatal execution error:', error);
  process.exit(1);
});
