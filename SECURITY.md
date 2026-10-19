# Security Policy

## Reporting

Report suspected vulnerabilities privately to the repository owner. Do not open a
public issue containing exploit details before a fix is available.

## Scope

DAOResolve is an advisory dispute-assessment primitive. It does not hold funds or
execute governance actions. Security-relevant areas include:

- Authorization and role management.
- State-machine transitions and challenge windows.
- Rule version pinning.
- Evidence bounds and prompt-injection resistance.
- Consensus invariant checks.
- Deterministic error behavior.

## Trust assumptions

Recorders and rule registrars are trusted to supply honest events and the DAO's
intended rules. Participants and evidence are untrusted. See
[docs/threat-model.md](docs/threat-model.md).

## Secrets

Never commit private keys, seed phrases, API keys, or a populated `.env` file.
Use `.env.example` for templates. If a secret is exposed, rotate it immediately
and remove it from history.
