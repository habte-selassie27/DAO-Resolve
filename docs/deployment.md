# Deployment Guide

## Current status

DAOResolve is deployed on **StudioNet**:

| Item | Value |
|---|---|
| Contract | `contracts/dao_resolve.py` |
| Address | `0x48179D48495B7199a3FCb939c3f0F73a23c50b70` |
| Deploy transaction | `0x4889cd93bf8ce27b2107c11e474bfea3e06e44fa2f0d6d4ff8fd241a592c84ab` |
| Explorer | https://explorer-studio.genlayer.com/address/0x48179D48495B7199a3FCb939c3f0F73a23c50b70 |
| Schema | `deployments/studionet.schema.txt` |

The complete record, including write transactions and read outputs, is in
[../deployments/studionet.md](../deployments/studionet.md).

**Revision note:** that record documents the revision deployed and exercised on
StudioNet. The current working tree contains later contract changes and has not
been redeployed. Verify `genlayer code <address>` against the working tree before
claiming the on-chain source is byte-identical.

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
