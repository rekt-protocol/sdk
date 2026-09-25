import { RektClient } from '@rekt-protocol/sdk';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

/**
 * ============================================================================
 * REKT SDK DEMO: EIP-7702 Delegation Auditing & Neutralization
 * ============================================================================
 * 
 * BACKGROUND:
 * EIP-7702 introduces temporary smart contract bytecode delegation for standard
 * Externally Owned Accounts (EOAs). When an account delegates its code, its on-chain
 * bytecode begins with the designator prefix: `0xef0100` followed by the 20-byte
 * address of the target contract.
 * 
 * THE ATTACK VECTOR:
 * Malicious phishing dApps can trick users into signing an EIP-7702 authorization.
 * Once submitted, the victim's wallet executes arbitrary malicious contract code
 * every time it is invoked, effectively hijacking the account.
 * 
 * THE SOLUTION:
 * 1. `inspectDelegation`: Checks if an account has active delegated bytecode.
 * 2. `executeDelegation`: Signs and relays an authorization tuple with sponsored gas.
 * 3. `neutralizeDelegation`: Authorizes delegation to `address(0)` with sponsored gas,
 *    instantly clearing the malicious bytecode and restoring the account to a clean EOA.
 */

async function main() {
  const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY as `0x${string}`;
  if (!sponsorPrivateKey || !sponsorPrivateKey.startsWith('0x')) {
    console.error('❌ Error: Missing required SPONSOR_PRIVATE_KEY environment variable.');
    console.error('Please configure your private key in .env or run with:');
    console.error('  SPONSOR_PRIVATE_KEY=0x... npx tsx examples/eip7702-demo.ts\n');
    process.exit(1);
  }

  console.log('🚀 Initializing REKT Client (Target: Base Sepolia Testnet)...');
  const rekt = await RektClient.create({
    network: 'base-sepolia-testnet',
    rpcUrl: process.env.RPC_URL || 'https://sepolia.base.org',
  });

  // 1. Sponsor Account: Covers network gas fees for relaying
  const sponsorAccount = privateKeyToAccount(sponsorPrivateKey);

  // 2. Test Account: Ephemeral keypair generated to demonstrate delegation & cleanup
  const testAccountPrivateKey = generatePrivateKey();
  const testAccount = privateKeyToAccount(testAccountPrivateKey);

  console.log('============================================================');
  console.log('🛡️ REKT EIP-7702 DELEGATION & NEUTRALIZATION DEMO');
  console.log('============================================================');
  console.log('Sponsor Address      (Pays Gas)  :', sponsorAccount.address);
  console.log('Test Account Address (Audited)   :', testAccount.address);
  console.log('Target Protocol Contract         :', rekt.contractAddress);
  console.log('============================================================\n');

  // -------------------------------------------------------------
  // [Step 1] Inspect Initial State (Fresh EOA)
  // -------------------------------------------------------------
  console.log('[Step 1/5] Inspecting initial delegation state...');
  const initialStatus = await rekt.eip7702.inspectDelegation(testAccount.address);
  console.log('Initial Status:', initialStatus);

  // -------------------------------------------------------------
  // [Step 2] Delegate to REKT contract via EIP-7702 (Simulating Delegation)
  // -------------------------------------------------------------
  console.log('\n[Step 2/5] Delegating account to REKT contract (sponsored gas)...');
  const auth = await rekt.eip7702.signAuthorization({
    accountPrivateKey: testAccountPrivateKey,
    targetContract: rekt.contractAddress,
  });
  console.log('Authorization Tuple Signed:', {
    target: auth.address,
    chainId: auth.chainId,
    nonce: auth.nonce,
  });

  const delegateTx = await rekt.eip7702.executeDelegation({
    sponsorPrivateKey,
    targetAccount: testAccount.address,
    authorization: auth,
  });
  console.log('✓ Delegation Transaction Broadcasted:', delegateTx);
  console.log(`  Explorer Link: https://sepolia.basescan.org/tx/${delegateTx}`);

  // Brief pause for RPC node state settlement
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // -------------------------------------------------------------
  // [Step 3] Inspect Delegated State
  // -------------------------------------------------------------
  console.log('\n[Step 3/5] Inspecting active on-chain delegation...');
  const delegatedStatus = await rekt.eip7702.inspectDelegation(testAccount.address);
  console.log('Delegated Status:');
  console.log(`  - Has Active Delegation: ${delegatedStatus.hasDelegation ? '⚠️ YES' : 'NO'}`);
  console.log(`  - Delegated Contract   : ${delegatedStatus.delegatedTarget}`);
  console.log(`  - Bytecode Header      : ${delegatedStatus.rawCode}`);

  // -------------------------------------------------------------
  // [Step 4] Neutralize & Revoke Delegation (Reset to Clean EOA)
  // -------------------------------------------------------------
  console.log('\n[Step 4/5] Neutralizing delegation (delegating to address(0))...');
  const neutralizationTx = await rekt.eip7702.neutralizeDelegation({
    accountPrivateKey: testAccountPrivateKey,
    sponsorPrivateKey,
  });
  console.log('✓ Neutralization Transaction Broadcasted:', neutralizationTx);
  console.log(`  Explorer Link: https://sepolia.basescan.org/tx/${neutralizationTx}`);

  // Brief pause for RPC node state settlement
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // -------------------------------------------------------------
  // [Step 5] Verify Account is Restored to Clean EOA
  // -------------------------------------------------------------
  console.log('\n[Step 5/5] Verifying account is restored back to clean EOA...');
  const finalStatus = await rekt.eip7702.inspectDelegation(testAccount.address);
  console.log('Final Status:');
  console.log(`  - Has Active Delegation: ${finalStatus.hasDelegation ? 'YES' : '✅ NO (CLEAN EOA)'}`);
  console.log(`  - Bytecode             : ${finalStatus.rawCode ?? '0x (Empty)'}`);

  if (!finalStatus.hasDelegation) {
    console.log('\n🎉 Account successfully neutralized! Bytecode delegation purged.');
  }
}

main().catch((error) => {
  console.error('Fatal execution error:', error);
  process.exit(1);
});
