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
| **NFT Rescue (Hybrid Auto-Detect)** | [`rescue-nfts-demo.ts`](./examples/typescript/rescue-nfts-demo.ts) | [`rescue-nfts-demo.js`](./examples/javascript/rescue-nfts-demo.js) | Sponsored ERC-721 & ERC-1155 NFT recovery with EIP-165 auto-detection |
| **Claim & Rescue** | [`claim-rescue-demo.ts`](./examples/typescript/claim-rescue-demo.ts) | [`claim-rescue-demo.js`](./examples/javascript/claim-rescue-demo.js) | Atomic airdrop claim and asset rescue in a single transaction |
| **Allowance Revoke** | [`approval-revoke-demo.ts`](./examples/typescript/approval-revoke-demo.ts) | [`approval-revoke-demo.js`](./examples/javascript/approval-revoke-demo.js) | Identification and batch revocation of token allowances |
| **Permit Inspection** | [`permit-inspection-demo.ts`](./examples/typescript/permit-inspection-demo.ts) | [`permit-inspection-demo.js`](./examples/javascript/permit-inspection-demo.js) | EIP-2612 & Uniswap Permit2 nonce and signature verification |
| **EIP-7702 Audit & Remediate** | [`eip7702-demo.ts`](./examples/typescript/eip7702-demo.ts) | [`eip7702-demo.js`](./examples/javascript/eip7702-demo.js) | EIP-7702 malicious delegation auditing and neutralization |

---

### 🎨 Hybrid Smart Auto-Detect for NFTs (ERC-721 & ERC-1155)

The SDK provides an intelligent, unified NFT rescue method that eliminates guesswork:
* **EIP-165 Auto-Detection**: Automatically queries `supportsInterface` on-chain to determine whether the collection is ERC-721 (`0x80ac58cd`) or ERC-1155 (`0xd9b67a26`).
* **Auto-Balance Fetching**: For ERC-1155 tokens, if `amounts` is omitted, the SDK automatically inspects `balanceOf(compromisedAddress, id)` on-chain so the victim's entire balance is secured.
* **Manual Override & Explicit Sub-Methods**: Developers can optionally enforce `standard: 'erc721' | 'erc1155'`, or call `executeRescueERC721` / `executeRescueERC1155` directly.

```typescript
// Unified call with smart auto-detection:
const txHash = await rekt.rescue.executeRescueNfts({
  compromisedPrivateKey: '0x...',
  sponsorPrivateKey: '0x...',
  safeReceiver: '0xSafeReceiverAddress...',
  tokens: ['0xNftContractAddress...'],
  tokenIds: [42n],
  // standard: 'auto', // default: auto-detected via EIP-165
  // amounts: [1n],     // for ERC-1155: auto-reads balanceOf if omitted
});
```

---

### 🛡️ Smart Error Diagnostics & Revert Decoding

When an on-chain transaction or simulation reverts (e.g. an airdrop is already claimed, deadline has passed, or signature is invalid), standard Viem errors return generic `Execution reverted for an unknown reason`. 

The REKT SDK automatically simulates the call against protocol ABI to extract custom errors and throws an informative `RektExecutionError`:

```typescript
import { RektExecutionError } from '@rekt-protocol/sdk';

try {
  await rekt.rescue.executeClaimRescue({ ... });
} catch (err) {
  if (err instanceof RektExecutionError) {
    console.error('Revert Name:', err.revertName); // e.g. 'ClaimFailed'
    console.error('Explanation:', err.friendlyMessage);
  }
}
```

---

## 🔒 Security Architecture

* **Zero-Gas Requirement**: Compromised accounts never require native gas funding, eliminating the risk of gas theft by hostile drainer bots.
* **Cryptographic Authorization**: All actions are validated on-chain through EIP-712 structured typed data signatures.
* **Deterministic Execution**: Protocol contracts ensure that asset transfer, fee routing, and safety guarantees execute atomically within the same transaction.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](./LICENSE) for details.  
Copyright © 2026 [REKT Protocol](https://rekt.zip). All rights reserved.
