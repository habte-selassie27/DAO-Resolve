# Deployment Guide

## Current status

DAOResolve is deployed on **StudioNet**. The official deployment runs the
current source:

| Item | Value |
|---|---|
| Contract | `contracts/dao_resolve.py` (1,463 lines) |
| Source SHA-256 | `ed6dff655962b4219dfc1e87c3930900a10aaf68a541be5e5f9e7c429de5f855` |
| Address | `0x8A4bEfBcd15A27155AA2D4b132F6AB86123B56F2` |
| Deploy transaction | `0xb138073ad159cd0e78070490d3d3d9e74ecab2e0ebcf62b5e92680661f29743d` |
| Deploy status | `FINALIZED` (execution mode `NORMAL`, 5 validators) |
| Owner | `0x5B3661C576c7001e6d6279C67F3779705d334c89` |
| Explorer | https://explorer-studio.genlayer.com/address/0x8A4bEfBcd15A27155AA2D4b132F6AB86123B56F2 |
| Studio import | https://studio.genlayer.com/?import-contract=0x8A4bEfBcd15A27155AA2D4b132F6AB86123B56F2 |
| Schema | `deployments/studionet.schema.json` (28 methods; older `.txt` retained) |

The complete record, including write transactions and read outputs, is in
[../deployments/studionet.md](../deployments/studionet.md).

**Source match:** the stored code at this address was downloaded through
`gen_getContractCode`, decoded, and hashed. It is byte-identical to
`contracts/dao_resolve.py` (`f0a4abc1…`).

**Live exercise:** every read and write method was executed against this
deployment from the owner account on 2026-10-20 — including a full dispute
lifecycle to `FINALIZED`, a challenge/re-evaluation round under real consensus,
and the two intended `EXPECTED:` rejections (vote-required finality, deprecated
rule). Hashes are recorded in [../deployments/studionet.md](../deployments/studionet.md).
The challenge window was restored to the 24-hour default afterwards; `R1` is
deprecated by that exercise and `R2` remains active.

**2026-10-23 update:** the current source was redeployed fresh to prove the pinned runner
is accepted by StudioNet: `0x1bB0D68FF747f74ACccD1FBb3D992C9B2d23335e`, deploy tx
`0xc500a18432b27137ff002628b939d01d5287fe8ac3785ea88dbdb1dd846dd2c9`, `FINALIZED` with
`MAJORITY_AGREE`. The demo contract keeps a recorder role for the CLI, but event registration is open
(`0x84a0cB58d217b08ed95b540b7D3ABdC5bBA3443C`), and the ENS recorder plan is on chain.
The deployable frontend is `frontend/`; it needs a same-origin `/api` proxy to StudioNet
(Vite dev server and `frontend/server.js` provide it). See
[../deployments/studionet.md](../deployments/studionet.md).

**Revision note:** the earlier instance `0xDD29Ae63…` runs the revision before
the readable-citation support floor and the derived `decided_by` field. Its
write flow is preserved in the deployment record as the receipt trail, but it
does not match the working tree.

**Bradbury:** the deployment attempt was rejected by the node with
`gas limit too high` before confirmation. No funds were spent. This optional
milestone is blocked pending a gas-limit or runner change. See
[../deployments/bradbury.md](../deployments/bradbury.md).

## Prerequisites

- Node 22+ and npm for the frontend and recorder.
- Contract implementation complete and lint-clean.
- Direct tests green.
- Integration tests green on the selected network.
- GenLayer CLI installed and authenticated.
- A funded account for networks that require gas.

StudioNet is gasless; 0 GEN is expected and fine. Bradbury and Asimov require
funded accounts. The faucet is browser-based:
https://testnet-faucet.genlayer.foundation/

## Procedure

```bash
# 1. Select a built-in network. Do not override the RPC manually.
genlayer network set <network>

# 2. Deploy the contract.
genlayer deploy --contract contracts/dao_resolve.py

# 3. Record the contract address.

# 4. Save the schema.
genlayer schema <address>

# 5. Verify with a read call.
genlayer call <address> get_config

# 6. Exercise a write call and inspect the receipt.
genlayer write <address> <write-method> [args]
genlayer receipt <txHash> --stdout --stderr

# 7. Locate the transaction in the relevant explorer.
```

## Deployment record

Fill this in only after a real deployment:

```text
NETWORK:
CONTRACT FILE:
ADDRESS:
DEPLOY TX:
EXPLORER LINK:
SCHEMA SAVED AT:
FIRST READ RESULT:
FIRST WRITE TX:
RECEIPT STATUS:
DATE:
```

## Debugging a failed transaction

```bash
genlayer receipt <txHash> --stdout --stderr
genlayer schema <address>
genlayer code <address>
```

Then reproduce with a direct test before changing contract code.

## Known CLI note

The installed CLI converts an empty string argument to integer `0`. For
`record_process_event`, pass a non-empty `evidence_ref` such as
`onchain:vote-start`. The contract accepts an empty string when correctly
encoded; the CLI coercion is the issue.

## Network notes

- **StudioNet:** gasless, deployed and verified.
- **Bradbury:** the 2026-10-19 attempt with `0x04e0…db1b` (9.93 GEN) was
  rejected by the node with `gas limit too high`; no confirmed transaction.
- **Asimov:** funded account required; not attempted.

Never override the RPC manually. Use `genlayer network set` for built-in networks.

## Related documents

- [testing.md](testing.md)
- [../deployments/README.md](../deployments/README.md)
- [../AGENTS.md](../AGENTS.md)
