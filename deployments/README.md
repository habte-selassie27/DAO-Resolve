# Deployment Records

## Verified deployments

| Network | Record | Status |
|---|---|---|
| StudioNet | [studionet.md](studionet.md) | Official deployment `0xb4d8bf96…`, source verified byte-identical |
| Bradbury Testnet | [bradbury.md](bradbury.md) | Blocked by node-side gas-limit rejection |

The StudioNet schema dump is [studionet.schema.txt](studionet.schema.txt), taken
from the official address. That instance is fresh: the deploy is its only
transaction, so rules and disputes have not been registered on it. The write
flow on the earlier instance `0xDD29Ae63…` is preserved in the same record as
the receipt trail for the evaluation pipeline.

Each record contains:

- Network name.
- Contract file and version.
- Contract address.
- Deployment transaction hash.
- Explorer link.
- Path to the saved schema.
- First read result.
- Write transactions and receipt status.
- Date.

## Rule

Do not add placeholder addresses, hashes, or explorer links. Records are added
only after a transaction can be verified. The current StudioNet record includes
real hashes and read outputs; the Bradbury record documents a failed attempt and
does not claim a deployment.

See [../docs/deployment.md](../docs/deployment.md) for the procedure.
