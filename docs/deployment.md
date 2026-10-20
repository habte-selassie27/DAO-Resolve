# Deployment Guide

## Current status

DAOResolve is deployed on **StudioNet**:

| Item | Value |
|---|---|
| Contract | `contracts/dao_resolve.py` (1,397 lines at deploy time; working tree is 1,463) |
| Address | `0xDD29Ae63f12Fbb586551251eDeb94B51aC666DfA` |
| Deploy transaction | `0x3157b6a8137b74a162afcfbb288da91bd635062e0d7feaac60179aa3762c9f66` |
| Explorer | https://explorer-studio.genlayer.com/address/0xDD29Ae63f12Fbb586551251eDeb94B51aC666DfA |
| Schema | `deployments/studionet.schema.txt` |

The complete record, including write transactions and read outputs, is in
[../deployments/studionet.md](../deployments/studionet.md).

**Revision note:** that record documents the revision deployed and exercised on
StudioNet. The working tree has since gained the readable-citation support
floor and the derived `decided_by` field, so the on-chain source is **older**
than `contracts/dao_resolve.py`. Redeploy before claiming the on-chain source
matches the working tree, then verify with `genlayer code <address>`.

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
