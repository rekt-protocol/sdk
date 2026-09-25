import { RektClient } from '@rekt-protocol/sdk';

/**
 * ============================================================================
 * REKT SDK DEMO: Token Permit & Permit2 Nonce Auditing
 * ============================================================================
 * 
 * SCENARIO:
 * Many modern ERC-20 tokens support off-chain signature-based approvals:
 * 1. EIP-2612: Built-in `permit()` method allowing gasless approvals.
 * 2. Uniswap Permit2: Canonical smart contract approval router (EIP-712).
 * 
 * WHY AUDIT PERMITS?
 * If an account signed an offline permit that has not yet been submitted to the
 * blockchain, frontrunning attackers or drainers might hold that signature and
 * attempt to broadcast it later. Checking the current account nonce and domain
 * separator reveals whether a signature is pending or invalidated.
 * 
 * NOTE:
 * This script is completely read-only. No private keys or gas fees are required.
 */

async function main() {
  console.log('🚀 Initializing REKT Client (Target: Base Sepolia Testnet)...');
  const rekt = await RektClient.create({
    network: 'base-sepolia-testnet',
    rpcUrl: process.env.RPC_URL || 'https://sepolia.base.org',
  });

  // Account address to inspect for active permits and nonces
  const accountToInspect =
    (process.env.TARGET_ACCOUNT as `0x${string}`) ||
    '0xec09062027978185Fd30B08B9241B220CB568E9f';

  // Tokens to inspect
  const tokensToAudit = [
    {
      address: '0xc0fC9DDA4Ddea31E125979C942E454371785786a' as const,
      name: 'USDT (Demo ERC-20)',
    },
  ];

  console.log('============================================================');
  console.log('🔍 REKT PERMIT AUDIT DEMO (EIP-2612 & Uniswap Permit2)');
  console.log('============================================================');
  console.log(`Audited Account: ${accountToInspect}\n`);

  for (const token of tokensToAudit) {
    console.log(`Auditing Token: ${token.name} (${token.address})...`);
    const permitInfo = await rekt.permits.inspectPermit(token.address, accountToInspect);

    console.log('  Audit Summary:');
    console.log(`  - Token Name      : ${permitInfo.tokenName}`);
    console.log(`  - Token Symbol    : ${permitInfo.tokenSymbol}`);
    console.log(`  - Permit Supported: ${permitInfo.supportsPermit ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Standard Type   : ${permitInfo.standard}`);
    console.log(`  - Current Nonce   : ${permitInfo.currentNonce.toString()}`);
    if (permitInfo.domainSeparator) {
      console.log(`  - Domain Separator: ${permitInfo.domainSeparator}`);
    }
    console.log('');
  }

  console.log('✓ Permit audit completed.');
}

main().catch((error) => {
  console.error('Fatal execution error:', error);
  process.exit(1);
});
