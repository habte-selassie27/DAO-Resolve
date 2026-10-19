# Bradbury Testnet Attempt

## 2026-10-19

| Item | Value |
|---|---|
| Network | GenLayer Bradbury Testnet |
| Account | `0x04e0353b7218b66d6803725ce7342e6e1225db1b` (9.93 GEN) |
| Command | `genlayer network set testnet-bradbury && genlayer deploy --contract contracts/dao_resolve.py` |
| Result | RPC rejected the transaction before confirmation |

Error from the node (`eth_sendRawTransaction`):

```text
[0x4ce4b5e836542bb82daa347d2ee566304bd81a663768698d5ec43de581758b73]:
gas limit too high
```

The same contract file deployed successfully on StudioNet with the same CLI and
runner. This is a Bradbury-side gas-limit rejection, not a contract error: no
transaction was confirmed and no funds were spent.

## Status

BLOCKED (optional milestone). Not required for the submission: the required
public-network deployment is StudioNet and is fully verified in
`deployments/studionet.md`.

## Next step

Retry on Bradbury after checking the current gas limit with a smaller bytecode
revision or a newer runner, for example:

```bash
genlayer network set testnet-bradbury
genlayer deploy --contract contracts/dao_resolve.py
```

If the same error appears, inspect the transaction fee options (`--fees`,
`--fee-value`) supported by the installed CLI and the current Bradbury gas cap
before retrying.
