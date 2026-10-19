# Deployment Records

## Verified deployments

| Network | Record | Status |
|---|---|---|
| StudioNet | [studionet.md](studionet.md) | Earlier revision deployed and verified |
| Bradbury Testnet | [bradbury.md](bradbury.md) | Blocked by node-side gas-limit rejection |

The StudioNet schema dump is [studionet.schema.txt](studionet.schema.txt). The
working tree contains later contract changes that have not been redeployed.

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
