# Changelog

All notable changes to DAOResolve are recorded here.

## 2026-10-19

DONE: Completed the standalone GenLayer Intelligent Contract and the M1–M9
deliverables:

- Contract with role-based administration, versioned rules, proposal events,
  disputes, evidence, deterministic checks, custom leader/validator consensus,
  challenges, re-evaluation, finality, and escalation.
- Direct test suite covering rules, disputes, evaluation, parsing, challenges,
  access control, equivalence helpers, and web evidence.
- Integration tests exercising real consensus on StudioNet.
- Design, domain model, state machine, access control, limits, API, equivalence,
  threat model, examples, testing, deployment, and glossary documentation.
- StudioNet deployment record with schema, transaction hashes, and explorer
  links. The record covers an earlier deployed revision; the current working
  tree contains later changes that are tested but not redeployed.
- Bradbury attempt documented as blocked by a node-side gas-limit rejection.

PROOF:

- `GENVM_VERSION=v0.3.0-rc7 genvm-lint check contracts/dao_resolve.py --json`
  -> clean, 3 checks passed.
- `python3.12 -m pytest tests/direct/ -q` -> **157 passed in 5.77s**.
- `gltest tests/integration/ -v -s --network studionet` -> **3 passed in
  243.40s**, as recorded in `deployments/studionet.md`.
- StudioNet contract:
  `0x48179D48495B7199a3FCb939c3f0F73a23c50b70`.
- Explorer:
  https://explorer-studio.genlayer.com/address/0x48179D48495B7199a3FCb939c3f0F73a23c50b70

NEXT: Optional Bradbury retry once the node gas limit or runner revision allows
the deployment; otherwise the required StudioNet deployment is complete.

BLOCKED: Bradbury returns `gas limit too high` from the node before confirmation.
No funds were spent. See `deployments/bradbury.md`.
