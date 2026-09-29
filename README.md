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

### 1. Initialize Client (Multi-RPC Failover Architecture)

Provide the target `chainId` and one or more RPC endpoints. When multiple RPCs are passed, the SDK automatically **random-picks** across nodes for load balancing and **fails over** to the next healthy RPC if an error or timeout occurs:

```typescript
import { RektClient } from '@rekt-protocol/sdk';

// Initialize with chainId and multiple RPCs (random pick + auto failover on error)
const rekt = await RektClient.create({
  chainId: 8453, // e.g. 1 for Ethereum, 8453 for Base, 56 for BSC, etc.
  rpcUrls: [
    'https://mainnet.base.org',
    'https://base.drpc.org',
    // 'https://base-mainnet.g.alchemy.com/v2/YOUR_KEY',
  ],
});

// Or synchronous constructor instantiation
const rektSync = new RektClient({
  chainId: 8453,
  rpcUrl: 'https://mainnet.base.org',
});
```

### 2. Core Diagnostic Workflows

```typescript
// Check if REKT protocol contract is deployed & supported on current chain
const isSupported = await rekt.isSupported(); // returns boolean (true / false)
if (!isSupported) {
  console.error(`Contract is not deployed on chain ${rekt.chainId}`);
}

// Inspect EIP-7702 delegation status on an account
const delegationStatus = await rekt.eip7702.inspectDelegation('0x1234...5678');
if (delegationStatus.hasDelegation) {
  console.warn('Active delegation detected:', delegationStatus.delegatedTarget);
}

// Inspect token Permit (EIP-2612 / Permit2) signature state and nonce
const permitState = await rekt.permits.inspectPermit(
  '0xTokenContractAddress...',
  '0xCompromisedAccountAddress...'
);
console.log(`Standard: ${permitState.standard} | Nonce: ${permitState.currentNonce}`);
```

---

## 📁 Repository Demos & Integration Examples

Comprehensive end-to-end integration scripts are provided in both TypeScript ([`examples/typescript/`](./examples/typescript)) and JavaScript ([`examples/javascript/`](./examples/javascript)):

| Feature Demo | TypeScript (`.ts`) | JavaScript (`.js`) | Description |
| :--- | :--- | :--- | :--- |
| **Token Rescue** | [`rescue-tokens-demo.ts`](./examples/typescript/rescue-tokens-demo.ts) | [`rescue-tokens-demo.js`](./examples/javascript/rescue-tokens-demo.js) | Sponsored ERC-20 asset recovery without requiring native gas |
| **Claim & Rescue** | [`claim-rescue-demo.ts`](./examples/typescript/claim-rescue-demo.ts) | [`claim-rescue-demo.js`](./examples/javascript/claim-rescue-demo.js) | Atomic airdrop claim and asset rescue in a single transaction |
| **Allowance Revoke** | [`approval-revoke-demo.ts`](./examples/typescript/approval-revoke-demo.ts) | [`approval-revoke-demo.js`](./examples/javascript/approval-revoke-demo.js) | Identification and batch revocation of token allowances |
| **Permit Inspection** | [`permit-inspection-demo.ts`](./examples/typescript/permit-inspection-demo.ts) | [`permit-inspection-demo.js`](./examples/javascript/permit-inspection-demo.js) | EIP-2612 & Uniswap Permit2 nonce and signature verification |
| **EIP-7702 Audit & Remediate** | [`eip7702-demo.ts`](./examples/typescript/eip7702-demo.ts) | [`eip7702-demo.js`](./examples/javascript/eip7702-demo.js) | EIP-7702 malicious delegation auditing and neutralization |

---

## 🔒 Security Architecture

* **Zero-Gas Requirement**: Compromised accounts never require native gas funding, eliminating the risk of gas theft by hostile drainer bots.
* **Cryptographic Authorization**: All actions are validated on-chain through EIP-712 structured typed data signatures.
* **Deterministic Execution**: Protocol contracts ensure that asset transfer, fee routing, and safety guarantees execute atomically within the same transaction.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](./LICENSE) for details.  
Copyright © 2026 [REKT Protocol](https://rekt.zip). All rights reserved.
