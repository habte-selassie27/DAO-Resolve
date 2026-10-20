# Deployment Guide

## Current status

DAOResolve is deployed on **StudioNet**. The official deployment runs the
current source:

| Item | Value |
|---|---|
| Contract | `contracts/dao_resolve.py` (1,463 lines) |
| Source SHA-256 | `f0a4abc1812e8d37354baee25ffcf40d47fb70a577003a2099cefd7e1636fe6a` |
| Address | `0xb4d8bf96a4E5E576c474741879B0E4D5cd6FbEcb` |
| Deploy transaction | `0xa99453271c7139fcdda8480e6050ae8bd623b55f9dc5020a755c610227cf146f` |
| Deploy status | `FINALIZED` (execution mode `NORMAL`, 5 validators) |
| Owner | `0x5B3661C576c7001e6d6279C67F3779705d334c89` |
| Explorer | https://explorer-studio.genlayer.com/address/0xb4d8bf96a4E5E576c474741879B0E4D5cd6FbEcb |
| Studio import | https://studio.genlayer.com/?import-contract=0xb4d8bf96a4E5E576c474741879B0E4D5cd6FbEcb |
| Schema | `deployments/studionet.schema.txt` |

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

**Revision note:** the earlier instance `0xDD29Ae63…` runs the revision before
the readable-citation support floor and the derived `decided_by` field. Its
write flow is preserved in the deployment record as the receipt trail, but it
does not match the working tree.

**Bradbury:** the deployment attempt was rejected by the node with
`gas limit too high` before confirmation. No funds were spent. This optional
milestone is blocked pending a gas-limit or runner change. See
[../deployments/bradbury.md](../deployments/bradbury.md).

## Prerequisites

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
- **Bradbury:** funded account required; currently blocked by a gas-limit
  rejection.
- **Asimov:** funded account required; not attempted.

Never override the RPC manually. Use `genlayer network set` for built-in networks.

## Related documents

- [testing.md](testing.md)
- [../deployments/README.md](../deployments/README.md)
- [../AGENTS.md](../AGENTS.md)
