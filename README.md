# `@rekt-protocol/sdk`

[![npm version](https://img.shields.io/npm/v/@rekt-protocol/sdk.svg)](https://www.npmjs.com/package/@rekt-protocol/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/badge/GitHub-rekt--protocol%2Fsdk-181717.svg?logo=github)](https://github.com/rekt-protocol/sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

Official TypeScript/JavaScript SDK for **REKT (Rescue EVM Kit Tool)**.  
A comprehensive Web3 defensive security toolkit engineered for compromised account asset recovery, sponsored gas relaying, allowance revocation, permit protection, and EIP-7702 delegation neutralization.

---

## 📦 Installation

```bash
npm install @rekt-protocol/sdk viem
# or
pnpm add @rekt-protocol/sdk viem
# or
yarn add @rekt-protocol/sdk viem
```

---

## ⚡ Quickstart

### 1. Initialize Client (Cache-First Architecture)

The SDK utilizes an intelligent universal cache with dynamic synchronization. On initial execution, it queries the live REKT Protocol API for deployed contracts, RPC endpoints, and ABIs, persisting them locally. Subsequent initializations execute with zero network latency.

```typescript
import { RektClient } from '@rekt-protocol/sdk';

// Initialize with automatic cache-first resolution and remote sync
const rekt = await RektClient.create({
  network: 'base-sepolia-testnet', // e.g. 'base', 'ethereum', 'arbitrum'
});

// Or synchronous initialization with predefined configuration
const rektSync = new RektClient({
  network: 'base-sepolia-testnet',
});
```

### 2. Core Diagnostic Workflows

```typescript
// Inspect EIP-7702 delegation status on an account
const delegationStatus = await rekt.eip7702.inspectDelegation('0x1234...5678');
if (delegationStatus.hasDelegation) {
  console.warn('Active delegation detected:', delegationStatus.delegatedTarget);
}

// Resolve verified affiliate / referrer handles
const affiliate = await rekt.referrers.lookupReferrer('security_partner');
if (affiliate.found) {
  console.log(`Payout Address: ${affiliate.wallet}`);
}

// Inspect token Permit (EIP-2612 / Permit2) signature state and nonce
const permitState = await rekt.permits.inspectPermit(
  '0xTokenContractAddress...',
  '0xCompromisedAccountAddress...'
);
console.log(`Standard: ${permitState.standard} | Nonce: ${permitState.currentNonce}`);
```

---

## 🛡️ Core Modules & Usage

### 1. Asset Recovery & Claim+Rescue (`rekt.rescue`)

Rescues ERC-20 and ERC-721 assets from compromised accounts without requiring native gas deposits into the affected wallet. Gas is sponsored externally, protecting assets from hostile drainers and frontrunning bots.

#### Atomic Claim & Rescue

Execute an airdrop claim or staking reward withdrawal and atomically rescue the resulting tokens to a secure cold wallet in a single bundled transaction:

```typescript
import { RektClient } from '@rekt-protocol/sdk';
import { encodeFunctionData, parseAbi } from 'viem';

const rekt = await RektClient.create({ network: 'base' });

// Prepare claim payload (e.g., Merkle distributor claim)
const claimPayload = encodeFunctionData({
  abi: parseAbi([
    'function claim(uint256 index, address account, uint256 amount, bytes32[] merkleProof)'
  ]),
  functionName: 'claim',
  args: [0n, '0xCompromisedAddress...', 1000000000000000000000n, ['0xproof...']]
});

// Execute atomic claim and transfer with external gas sponsorship
const transactionHash = await rekt.rescue.executeClaimRescue({
  compromisedAddress: '0xCompromisedAddress...',
  compromisedPrivateKey: process.env.COMPROMISED_PRIVATE_KEY as `0x${string}`, // Off-chain authorization
  sponsorPrivateKey: process.env.SPONSOR_PRIVATE_KEY as `0x${string}`,         // Provides native gas
  safeReceiver: '0xSecureColdWallet...',                                       // Verified destination
  claimTarget: '0xAirdropContractAddress...',
  claimCalldata: claimPayload,
  tokens: ['0xClaimedTokenAddress...'],                                        // Rescued atomically
  referrer: 'affiliate_handle'                                                 // Optional vanity or address
});

console.log('Claim & Rescue executed:', transactionHash);
```

---

### 2. Token Allowance Auditing & Revocation (`rekt.approvals`)

Identifies excessive token approvals across decentralized exchanges, bridges, and protocols, enabling direct or sponsored gas batch revocation.

```typescript
// Scan active allowances for specified tokens
const { approvals } = await rekt.approvals.scanApprovals(
  '0xAccountAddress...',
  ['0xUsdcAddress...', '0xWethAddress...']
);

// Execute sponsored batch revocation via EIP-712 permit
const revokeTxHash = await rekt.approvals.executeBatchRevoke({
  ownerPrivateKey: process.env.COMPROMISED_PRIVATE_KEY as `0x${string}`,
  sponsorPrivateKey: process.env.SPONSOR_PRIVATE_KEY as `0x${string}`,
  tokens: approvals.map((item) => item.token),
  spenders: approvals.map((item) => item.spender)
});

console.log('Batch revocation confirmed:', revokeTxHash);
```

---

### 3. EIP-7702 Account Delegation Security (`rekt.eip7702`)

Provides auditing and remediation tools for accounts utilizing EIP-7702 smart contract code delegation.

```typescript
// Query account bytecode to check for delegation designator (0xef0100...)
const status = await rekt.eip7702.inspectDelegation('0xTargetAccountAddress...');

if (status.hasDelegation) {
  console.warn('Account delegated to contract:', status.delegatedTarget);

  // Neutralize compromised delegation by clearing delegated bytecode to address(0)
  const neutralizationTx = await rekt.eip7702.neutralizeDelegation({
    accountPrivateKey: process.env.COMPROMISED_PRIVATE_KEY as `0x${string}`,
    sponsorPrivateKey: process.env.SPONSOR_PRIVATE_KEY as `0x${string}`
  });

  console.log('Account delegation successfully cleared:', neutralizationTx);
}
```

---

### 4. Verified Affiliate Resolution (`rekt.referrers`)

Resolves vanity referrer handles and manages referral fee routing:

```typescript
import { ReferrerService } from '@rekt-protocol/sdk';

const referrers = new ReferrerService();
const result = await referrers.lookupReferrer('partner_handle');

if (result.found) {
  console.log('Affiliate verified:', result.username, 'Payout wallet:', result.wallet);
}
```

---

## 💻 CLI Utility

The SDK bundles a lightweight command-line interface for rapid diagnostics and chain inspections:

```bash
# Display all currently supported networks and contract deployments
npx rekt networks

# Query verified referrer status
npx rekt referrer partner_handle

# Audit EIP-7702 delegation on a specific network
npx rekt check-7702 0x1234567890abcdef1234567890abcdef12345678 --network base-sepolia-testnet
```

---

## 📁 Repository Demos & Integration Examples

Comprehensive end-to-end integration scripts are provided in the [`examples/`](./examples) directory:

| Demo Script | Description |
| :--- | :--- |
| [`examples/rescue-tokens-demo.ts`](./examples/rescue-tokens-demo.ts) | Sponsored ERC-20 asset recovery without referral routing |
| [`examples/rescue-tokens-referral-demo.ts`](./examples/rescue-tokens-referral-demo.ts) | Sponsored ERC-20 asset recovery with dynamic referral routing |
| [`examples/claim-rescue-demo.ts`](./examples/claim-rescue-demo.ts) | Atomic airdrop claim and asset rescue in a single transaction |
| [`examples/claim-rescue-referral-demo.ts`](./examples/claim-rescue-referral-demo.ts) | Atomic claim and asset rescue with affiliate fee distribution |
| [`examples/approval-revoke-demo.ts`](./examples/approval-revoke-demo.ts) | Identification and batch revocation of token allowances |
| [`examples/permit-inspection-demo.ts`](./examples/permit-inspection-demo.ts) | EIP-2612 & Uniswap Permit2 nonce and signature verification |
| [`examples/eip7702-demo.ts`](./examples/eip7702-demo.ts) | EIP-7702 malicious delegation auditing and neutralization |

---

## 🔒 Security Architecture

* **Zero-Gas Requirement**: Compromised accounts never require native gas funding, eliminating the risk of gas theft by hostile drainer bots.
* **Cryptographic Authorization**: All actions are validated on-chain through EIP-712 structured typed data signatures.
* **Deterministic Execution**: Protocol contracts ensure that asset transfer, fee routing, and safety guarantees execute atomically within the same transaction.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](./LICENSE) for details.  
Copyright © 2026 [REKT Protocol](https://rekt.zip). All rights reserved.
