import { RektClient } from '@rekt-protocol/sdk';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http, parseUnits } from 'viem';
import { baseSepolia } from 'viem/chains';

/**
 * ============================================================================
 * REKT SDK DEMO: Token Allowance Auditing & Revocation
 * ============================================================================
 * 
 * SCENARIO:
 * Many decentralized finance hacks or phishing scams occur because a user
 * granted "unlimited allowance" to a malicious spender contract. Even if the
 * wallet key itself isn't compromised, the spender can drain authorized tokens.
 * 
 * SOLUTION:
 * 1. `scanApprovals`: Queries on-chain token allowances across major protocols
 *    (Uniswap, OpenSea, 1inch, Permit2, known drainer targets).
 * 2. `executeDirectRevoke`: Immediately resets an allowance to 0.
 * 3. `executeBatchRevoke`: Allows an external sponsor to pay gas to revoke
 *    multiple allowances in a single batch using an EIP-712 permit.
 */

const USDT_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

async function main() {
  const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY as `0x${string}`;
  if (!sponsorPrivateKey || !sponsorPrivateKey.startsWith('0x')) {
    console.error('❌ Error: Missing required SPONSOR_PRIVATE_KEY environment variable.');
    console.error('Please configure your private key in .env or run with:');
    console.error('  SPONSOR_PRIVATE_KEY=0x... npx tsx examples/approval-revoke-demo.ts\n');
    process.exit(1);
  }

  console.log('🚀 Initializing REKT Client (Target: Base Sepolia Testnet)...');
  const rekt = await RektClient.create({
    network: 'base-sepolia-testnet',
    rpcUrl: process.env.RPC_URL || 'https://sepolia.base.org',
  });

  const sponsorAccount = privateKeyToAccount(sponsorPrivateKey);
  const targetToken = '0xc0fC9DDA4Ddea31E125979C942E454371785786a' as const; // Test USDT
  const testSpender = '0x3BEB95D673B0132B6b6b00F0B3f8cb8E13ED63Ec' as const; // Demo Spender Contract

  console.log('============================================================');
  console.log('🛡️ REKT TOKEN APPROVAL SCAN & REVOKE DEMO');
  console.log('============================================================');
  console.log('Audited Account Address :', sponsorAccount.address);
  console.log('Audited Token Address   :', targetToken);
  console.log('Target Spender Address  :', testSpender);
  console.log('============================================================\n');

  const walletClient = createWalletClient({
    account: sponsorAccount,
    chain: baseSepolia,
    transport: http(process.env.RPC_URL || 'https://sepolia.base.org'),
  });

  // Step 1: Grant a test allowance to simulate an active approval
  console.log('[Step 1/3] Granting test approval of 500 USDT to spender...');
  const approveTx = await walletClient.writeContract({
    address: targetToken,
    abi: USDT_ABI,
    functionName: 'approve',
    args: [testSpender, parseUnits('500', 6)],
  });
  console.log(`Approval Transaction: https://sepolia.basescan.org/tx/${approveTx}`);
  await rekt.publicClient.waitForTransactionReceipt({ hash: approveTx });

  // Step 2: Scan active approvals using REKT SDK
  console.log('\n[Step 2/3] Scanning active allowances via rekt.approvals.scanApprovals()...');
  const scanResult = await rekt.approvals.scanApprovals(
    sponsorAccount.address,
    [targetToken],
    [{ address: testSpender, label: 'Demo Spender Target' }]
  );

  console.log(`Scan Results: Found ${scanResult.approvals.length} active allowance(s).`);
  for (const item of scanResult.approvals) {
    console.log(
      `  - Spender: ${item.spenderAddress} | Allowance: ${Number(item.allowance) / 1e6} USDT`
    );
  }

  // Step 3: Revoke allowance back to 0
  console.log('\n[Step 3/3] Revoking allowance back to 0...');
  const revokeTx = await rekt.approvals.executeDirectRevoke({
    tokenAddress: targetToken,
    spenderAddress: testSpender,
    ownerPrivateKey: sponsorPrivateKey,
  });

  console.log('✓ Revocation confirmed on-chain!');
  console.log(`✓ Explorer Link: https://sepolia.basescan.org/tx/${revokeTx}`);
  console.log('\n🎉 Token allowance successfully neutralized!');
}

main().catch((error) => {
  console.error('Fatal execution error:', error);
  process.exit(1);
});
