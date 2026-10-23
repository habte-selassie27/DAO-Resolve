# AGENTS.md — DAOResolve Project (Full GenLayer Project Submission)

> Audience: any coding agent (Claude Code, Cursor, Codex, Copilot, etc.).
> Target: GenLayer builder program, category **Project** (contract + frontend + docs + demo).
> Baseline: the existing DAOResolve Intelligent Contract (contracts/dao_resolve.py).
> Companion files: UI.md (frontend spec). If a Prompt.md or inspector prompt exists, use it for review passes.
> Rule zero: if this file and the official GenLayer docs disagree, the docs win.
> Submission slots: the program allows 2 Project submissions per week and reviews are strict.
> Do not spend a slot until the pre-submit checklist (section 25) is fully true.

---

## 0. AGENT PROMPT (GENLAYER BASE CONTEXT)

You are a coding agent implementing a GenLayer project. Treat GenLayer as a
blockchain/protocol for trustless adjudication, not as a synonym for Intelligent Contracts.
Intelligent Contracts are one core product: Python contracts executed in GenVM that can use
LLMs, live web/API data, and unstructured inputs, then settle outcomes on-chain through
GenLayer's AI-validator consensus.

Context:
- AI-validator consensus resolves transactions that need judgment, not only deterministic code.
- Consensus model: Optimistic Democracy. A leader proposes a result, independent validators
  evaluate it, accepted results enter an appeal/finality process, finalized outcomes are permanent.
- Two layers: GenLayer Chain (EVM-compatible L2: accounts, balances) and GenVM (executes
  Intelligent Contracts).
- Intelligent Contracts are Python, run in GenVM, and can process natural language, fetch live
  web data, analyze unstructured content, and use images or other evidence through LLM calls.
- Validators agree on MEANING, not exact bytes. Never model GenLayer as a normal EVM chain.
- Design explicit validation and equivalence rules for every LLM, web, image, or other
  non-deterministic result.

Official agent context first:
- Skills: https://skills.genlayer.com/
- Claude Code: `/plugin marketplace add genlayerlabs/skills` then
  `/plugin install genlayer-dev@genlayerlabs`
- Use `genlayernode` only for validator-node operation.

Skills and when to use them:
- write-contract: before and during contract work.
- genvm-lint: after EVERY contract change. `genvm-lint check contracts/<file>.py --json`
- direct-tests: fast in-memory tests, mocked web/LLM. `pytest tests/direct/ -v`
- integration-tests: real consensus on Studio, GLSim, StudioNet, Bradbury.
  `gltest tests/integration/ -v -s`
- genlayer-cli: networks, accounts, deploy, calls, writes, schemas, receipts, traces.

MCP (when supported):
- `claude mcp add genlayer-docs --transport sse https://docs-mcp.genlayer.com/sse`
- `claude mcp add genlayer npx -- -y genlayer-mcp`
- No MCP? Use https://docs.genlayer.com/full-documentation.txt and
  https://sdk.genlayer.com/main/_static/ai/api.txt

Packages: `npm install -g genlayer`, `pip install genvm-linter`, `pip install genlayer-test`
(or `[sim]`), `npm install genlayer-js` (frontend), `genlayer-py` (verify API first).

Network rules:
- `genlayer network set` for built-in networks; never override RPC manually.
- StudioNet is gasless; 0 GEN is expected.
- Bradbury and Asimov need funded accounts. Faucet: https://testnet-faucet.genlayer.foundation/
  (browser-based, cannot be fully automated).
- Debug failed txs: `genlayer receipt <txHash> --stdout --stderr`, then
  `genlayer schema <address>`, `genlayer code <address>`, then read calls.

Application integration gap (applies here, the project has a frontend):
- Skills do not fully cover genlayer-js. Consult its docs, never invent client method names,
  inspect the deployed schema first, separate read calls from write calls, and show submitted,
  pending, accepted, finalized, and failed states.

Deliverables: smallest complete implementation that passes lint and tests; if anything is
unavailable, say exactly what is blocked and the next step; never leave APIs guessed.

---

## 1. PROJECT IDENTITY

**Name:** DAOResolve
**One-liner:** An advisory dispute-adjudication layer for DAOs: register governance rules,
record the real process, and let AI-validator consensus assess whether a proposal complied,
with deterministic checks first, challenges, escalation to the DAO's own procedure, and an
append-only public record.

**The trust problem**
- DAO rules are written in natural language and disputes about "did the process comply?"
  are decided informally, by whoever holds the loudest voice or the admin key.
- A single LLM answer is not trustworthy either: it can be steered, cannot be audited, and
  is not reproducible.
- DAOResolve combines code-decided facts (timing, counts, required events), live evidence
  fetched by validators, and consensus on interpretation, and it records everything.

**What it is**
- The DAOResolve Intelligent Contract (rules, proposals, process events, disputes, evidence,
  assessments, challenges, finality, escalation).
- A recorder tool that ingests process events from authoritative public sources.
- A frontend that calls the contract and handles the full transaction lifecycle.
- Docs, a scripted demo, a live deployment, and public write-ups.

**What it is NOT**
- Not a voting system; it never executes, cancels, or reverses governance actions.
- Not a legal ruling; output is "assessment against the registered rule version".
- Not an LLM wrapper: deterministic checks decide first; a model is used only for the
  residual interpretation of ambiguous clauses.

---

## 2. PRIME DIRECTIVES

1. GenLayer is a blockchain/protocol for trustless adjudication; Intelligent Contracts are
   one core product of it.
2. NEVER guess a GenLayer or genlayer-js API. Verify first and record it in the API ledger
   (section 9).
3. NEVER model this as a normal deterministic EVM contract.
4. Preserve the existing contract architecture unless a demonstrated defect justifies a
   change. Every contract change needs a failing test first, a lint pass, and a docs update.
5. Deterministic work stays in code; the LLM handles only genuinely interpretive questions.
6. Assessments are advisory and never penalize or execute anything.
7. The UI must show the truth about trust: who recorded events, which evidence was readable,
   whether a verdict was decided by code or by consensus, and whether it is final.
8. A strict reviewer is the audience. Never fabricate tests, receipts, addresses, hashes,
   explorer links, screenshots, or metrics.
9. Smallest complete implementation. Depth and correctness beat feature count.
10. Never commit secrets or private keys. Frontend code never holds signing keys.
11. If blocked, say exactly what is blocked and give the next command or manual step.

---

## 3. QUALITY BAR MAPPING (THE SUBMISSION CRITERIA)

| Criterion | How DAOResolve meets it | Evidence to produce |
|---|---|---|
| Solves a real trust problem, not just a better LLM response | Code-decided checks first, consensus only for ambiguity, append-only history, challenges, escalation | docs/design.md, tests proving the LLM cannot override a failed check |
| Uses live or authoritative data when outcomes depend on real-world facts | Evidence URLs fetched live by validators; recorder ingests events from authoritative public sources with evidence_ref links; optional on-chain event verification (stretch) | recorder tool output, evidence_ref links in UI, integration run |
| Complete source and accurate docs; submission notes explain what, problem, how to use | README, SUBMISSION.md, design, equivalence, threat model, guide for DAOs | docs reviewed against code; submission notes template (section 20) |
| Frontend genuinely calls the contract and handles the full transaction lifecycle | genlayer-js reads and writes; wallet signing; submitted, pending, accepted, finalized, failed, undetermined states | UI.md checklist, screen recording, tx hashes with explorer links |
| Meaningfully different from boilerplate, credible path to continued use | Original domain model; roadmap and adoption path for real DAOs; recorder tool and rule library | roadmap in README, pilot notes |
| Extra points: live demo, video, public posts | Hosted frontend on a public network, demo video, thread or article | URLs recorded in SUBMISSION.md |

---

## 4. REVIEWER PRE-MORTEM (WHAT A STRICT REVIEW WILL TRY)

Assume the reviewer will do all of this. Make each one pass.
1. Open the live demo and click through every screen on a fresh wallet.
2. Deploy the contract fresh on the stated network from the repo and run the documented demo.
3. Ask "is this just an LLM wrapper?" Check that deterministic checks decide without a model
   call and that a failed check forces VIOLATION.
4. Ask "where does real-world data come from?" Check evidence fetching and the recorder.
5. Try to break it: spam evidence, mislabel evidence sides, call restricted methods with the
   wrong account, challenge after the window, finalize early, open duplicate ids.
6. Trigger a failure (unreachable URL, consensus disagreement) and see whether the UI explains
   it and offers a retry rather than hanging.
7. Compare README claims to behavior; any mismatch is a defect.
8. Check the trust assumptions are stated honestly (trusted recorder, advisory output).
9. Check the repo builds, lints, and tests from a clean clone using only the README.
10. Look for dead code, leftover TODOs, secrets, and fabricated numbers.

---

## 5. SCOPE

In scope
- Contract hardening that fixes demonstrated defects (section 10), with tests
- Authoritative-source recorder tool (CLI) and its tests
- Frontend (UI.md) wired to the deployed contract
- Direct tests, integration tests, frontend tests, an end-to-end demo script
- Deployment on StudioNet and a public testnet, a hosted frontend
- Docs, submission notes, demo video script, public post drafts

Out of scope unless the user changes scope
- Token, treasury, or fund-moving logic
- Executing or enforcing verdicts on any DAO
- Replacing a DAO's voting or appeal procedure
- Identity verification of participants
- Contract rewrites for style alone

---

## 6. SOURCES OF TRUTH (IN ORDER)

1. Skills: https://skills.genlayer.com/
2. Docs MCP: https://docs-mcp.genlayer.com/sse
3. Full docs: https://docs.genlayer.com/full-documentation.txt
4. SDK reference (agents): https://sdk.genlayer.com/main/_static/ai/api.txt
5. SDK reference: https://sdk.genlayer.com/main/
6. Equivalence Principle: https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle
7. genlayer-js repo and README: https://github.com/genlayerlabs/genlayer-js
8. Test API: https://docs.genlayer.com/api-references/genlayer-test
9. Builder portal: https://portal.genlayer.foundation/builders/resources
10. The program's full submission guidelines (read them before submitting; they cover reviews,
    appeals, and slots; not verified here)

### 6.1 genlayer-js calls verified from its README and public examples
Confirm every item against the installed package version before relying on it.
- `createClient({ chain })` with chains imported from `genlayer-js/chains`
  (examples show `studionet`, `localnet`, and `testnetBradbury`)
- `createAccount(...)` from `genlayer-js`; `TransactionStatus` from `genlayer-js/types`
- `client.readContract({ address, functionName, args, stateStatus? })`
- `client.writeContract({ address, functionName, args, value })` returns a tx hash
- `client.waitForTransactionReceipt({ hash, status, retries, interval, fullTransaction? })`
  with `status` as `TransactionStatus.ACCEPTED` or `TransactionStatus.FINALIZED`
- `client.getTransaction({ hash })`
- Browser dApp pattern: two clients, one read-only without a wallet and one wallet-signed
  for writes (the README recommends this)

Unverified and must be checked before use: how numeric arguments (u32, u64) are encoded from
JavaScript, how dict and list return values decode (plain object vs Map), the exact
`TransactionStatus` enum members and their order, wallet connection details, and how consensus
failure states appear in receipts.

---

## 7. REPOSITORY LAYOUT

```
daoresolve/
  AGENTS.md  UI.md  README.md  SUBMISSION.md  CHANGELOG.md  LICENSE
  contracts/
    dao_resolve.py                 # baseline contract (preserve architecture)
  tests/
    direct/                        # mocked web and LLM
    integration/                   # real consensus
  recorder/                        # authoritative-source ingestion CLI
    src/ (sources/, normalize/, cli.ts)  tests/
  scripts/
    deploy.sh  seed_demo.ts  verify_deployment.ts
  frontend/                        # see UI.md
  deployments/
    studionet.md  testnet.md       # address, schema, receipts, explorer links
  docs/
    design.md  equivalence.md  threat-model.md
    guide-for-daos.md  demo-script.md  api-ledger.md
  .github/workflows/ci.yml
  .env.example  .gitignore  requirements.txt
```

---

## 8. BASELINE CONTRACT INVENTORY (READ FROM THE SUPPLIED SOURCE; NOT EXECUTED)

### 8.1 Roles
Owner, rule registrar, recorder, escalator are single addresses set in the constructor to the
deployer. Owner can do everything; others are role-gated. Anyone can open disputes, submit
evidence, request evaluation or re-evaluation, challenge, finalize, and withdraw (disputant only).

### 8.2 State machine (dispute status)
OPEN -> EVALUATED -> CHALLENGED -> RE_EVALUATED -> (CHALLENGED ...) -> FINALIZED.
Any non-terminal state -> ESCALATED (escalator role). OPEN or EVALUATED -> WITHDRAWN (disputant).
Terminal: FINALIZED, ESCALATED, WITHDRAWN. Assessments, evidence, challenges are append-only.

### 8.3 Public methods
| Method | Purpose | Access |
|---|---|---|
| set_role, transfer_ownership, set_config, set_category_vote_required | Administration | owner |
| register_rule, deprecate_rule | Versioned rules with structured checks | registrar or owner |
| register_proposal, record_process_event | Proposal registry and ordered events | recorder or owner |
| open_dispute | Pins rule version and challenge policy | anyone |
| submit_evidence | Two-sided evidence (side is self-declared) | anyone, non-terminal |
| evaluate_dispute, re_evaluate | Deterministic checks, then consensus if needed | anyone |
| challenge_assessment | Reason plus optional new evidence, inside the window | anyone |
| finalize_dispute | After the window; blocked for vote-required categories | anyone |
| escalate_dispute | Records handoff to the DAO's own process | escalator or owner |
| withdraw_dispute | Disputant withdraws | disputant |

Views: get_config, get_rule, get_rule_version, list_active_rules, get_proposal, get_events,
get_dispute, get_dispute_status, list_disputes, get_evidence, get_assessment_history,
get_challenges. Pagination limit is at most 50.

### 8.4 Deterministic checks
MIN_ELAPSED, REQUIRED_EVENT, MIN_COUNT, REQUIRED_ROLE. A failed check forces VIOLATION in code
and the model is not called. DETERMINISTIC_ONLY rules never call the model.

### 8.5 Interpretation consensus (as written)
Leader and validators each fetch up to 3 evidence URLs, build a constrained prompt, and parse
the result defensively. Agreement requires: exact verdict; confidence bands within one step;
no COMPLIANT after a failed check; for decisive verdicts, at least one evidence id that both
runs could read and cited. The reasoning digest is not compared.

### 8.6 Error strings (contract-defined, used by the UI error map)
Prefixes: `EXPECTED:`, `EXTERNAL:`, `TRANSIENT:`, `LLM_ERROR:`. Examples: caller is not
authorized; invalid state transition; challenge window closed; challenge window still open;
maximum challenge rounds reached; evidence cap reached; dispute already exists; rule is
deprecated; category requires escalation to the DAO procedure; model tried to override a
failed deterministic check; decisive verdict must cite evidence; decisive verdict cites no
readable evidence.

---

## 9. API LEDGER (VERIFIED VS UNVERIFIED)

Keep docs/api-ledger.md in sync with this table. Every row needs a source and a date.

| Item | Status | Source or action |
|---|---|---|
| SDK reference at `main` documents v0.3 (marked "not released yet"): `import genlayer as gl`, `gl.contract.Contract`, `gl.storage.allow`, `gl.vm.run_nondet` (old `run_nondet_unsafe` renamed), `gl.vm.run_nondet_default`, `gl.message.raw` (old `gl.message_raw`), `UserError.data` (old `.message`), integer aliases not callable | VERIFIED in the fetched SDK reference | docs/api-ledger.md |
| Baseline contract uses v0.2-style names (`from genlayer import *`, `gl.Contract`, `@allow_storage`, `gl.vm.run_nondet_unsafe`, `gl.message_raw`, `exc.message`, `u64(...)` calls) under the Depends runner hash `1jb45aa8...` | VERIFIED by reading the source | decide in M1 |
| The SDK reference lists a different current py-genlayer runner hash than the pinned one | VERIFIED in the fetched reference | M1 smoke test |
| Which runner and API version each target network (StudioNet, testnet) accepts | NOT VERIFIED | deploy smoke test, M1 |
| `gl.nondet.web.render(url, mode=...)` exists in the pinned runner | NOT VERIFIED (listed in the `main` reference) | check before using |
| `gl.nondet.web.get(url)` returns an object with `status` and `body` | VERIFIED in the `main` reference; confirm for the pinned runner | |
| `gl.nondet.exec_prompt(prompt, response_format="json")` | VERIFIED in the `main` reference; confirm for the pinned runner | |
| genlayer-js calls in section 6.1 | VERIFIED from README and examples | confirm on installed version |
| Standard-library modules used by the contract (`datetime`, `json`, `re`) are available in GenVM | NOT VERIFIED | M1 deploy |

Migration rule: if the target network rejects the pinned runner, migrate using the SDK
migration guide one rename group at a time, lint after each group, rerun direct tests, and
document each change in CHANGELOG.md. Never migrate by search-and-replace without tests.

---

## 10. BASELINE FINDINGS TO RESOLVE (FROM READING THE SOURCE; NONE EXECUTED)

Severity and confidence are judgments from static review. Reproduce each with a test before
fixing. Fix only what is confirmed.

| ID | Finding | Severity / confidence | Planned fix or response |
|---|---|---|---|
| F1 | Runner and API version mismatch risk (section 9) | High / Medium | M1 smoke test; migrate only if rejected |
| F2 | Anyone can fill the 32-slot evidence cap and the evidence `side` label is self-declared, so labels can be spoofed and legitimate evidence or challenge evidence can be blocked | Medium / High | per-submitter cap; only the disputant may use side DISPUTANT; UI labels sides as self-declared; tests for each |
| F3 | Consensus can fail when leader and validator cite different readable evidence or noisy bands (validator errors under the unsafe run variant become Disagree) | Medium / Medium | measure disagreement in integration runs; keep strictness; UI shows an undetermined or failed evaluation with retry; consider the safer run variant only after verification |
| F4 | URL evidence is the first 3000 characters of the raw body, so modern pages are mostly markup | Medium / High | use rendered text if available in the pinned runner (verify), else extract text before truncating; test with a markup-heavy fixture |
| F5 | A challenged dispute stays CHALLENGED until someone calls re_evaluate | Low-Medium / High | permissionless by design; UI exposes "Request re-evaluation" and explains the state |
| F6 | Process events are asserted by a single trusted recorder; the facts behind deterministic checks are not independently verified | Medium (design) / High | recorder tool with evidence_ref links; strict_separation option; stretch on-chain event verification (section 13); honest docs |
| F7 | Caller-chosen ids allow namespace squatting and unbounded dispute creation | Low / High | UI generates unique ids and handles "already exists"; document |
| F8 | `web_digest` is produced by the leader and is not compared by validators | Low / High | label as informational in UI and docs; never present as proof |
| F9 | Evidence added after an assessment is not considered until re-evaluation | Low / High | UI note; document |
| F10 | Event recording requires chronological order and rejects timestamps more than one day in the future | Info | recorder tool sorts and validates before sending |

Change policy for fixes (applies to every F item)
1. Write a failing direct test that demonstrates the issue.
2. Make the smallest change that fixes it; do not refactor unrelated code.
3. Lint, rerun all direct tests, rerun affected integration tests.
4. Update docs/design.md, docs/threat-model.md, and CHANGELOG.md in the same pass.

---

## 11. EQUIVALENCE DESIGN (KEEP IN docs/equivalence.md)

```
CALL: interpret residual ambiguity for one pinned rule version
LEADER PRODUCES: {verdict, confidence_band, cited_clause_ids, cited_evidence_ids,
                  reasoning_digest, web_digest, available_evidence_ids}
VALIDATOR CHECKS: re-fetches the same evidence and re-derives its own result from the same
                  context; compares meaning
EQUIVALENCE RULE:
  - verdict equal (COMPLIANT, VIOLATION, INCONCLUSIVE)
  - confidence bands within one adjacent step
  - COMPLIANT never allowed after a failed deterministic check (both sides)
  - decisive verdicts must cite the pinned clause id, and when evidence exists, must cite at
    least one evidence id readable by both runs; unreadable evidence cannot support a verdict
  - reasoning_digest and web_digest are NOT compared
NORMALIZATION: uppercase enums, sorted unique citations, bounded text
FAILURES: invalid JSON, unknown enum, hallucinated id, uncited decisive verdict
FAILURE BEHAVIOR: classified error; no assessment appended; status unchanged
WHY NOT strict_eq: wording, confidence, and citation choices vary honestly between runs
KNOWN LIMITS: cannot detect a wrong verdict that every validator shares; does not verify that
              fetched content is true; recorder-asserted events are trusted
```

Rules for any change to this design
- Update the matrix tests first (must-accept, must-reject, boundary).
- Never loosen the invariants without a documented reason and a test.
- Record disagreement-rate observations from integration runs in docs/equivalence.md.

---

## 12. DETERMINISTIC VS NON-DETERMINISTIC SPLIT

| Question | Decided by |
|---|---|
| Was the minimum review period respected between two events? | Code (MIN_ELAPSED) |
| Does a required event exist? | Code (REQUIRED_EVENT) |
| Were at least N events of a type recorded? | Code (MIN_COUNT) |
| Did a required role act? | Code (REQUIRED_ROLE) |
| Is the dispute inside the challenge window? | Code |
| Does a forum thread show "adequate community discussion"? | Validators via live fetch plus model |
| Does the evidence support or contradict the claim? | Validators via live fetch plus model |

The UI and docs must show which of these produced each assessment (`decided_by`).

---

## 13. AUTHORITATIVE DATA STRATEGY

The quality bar asks for live or authoritative data when outcomes depend on real-world facts.
In DAOResolve the facts are "what happened in the process" and "what the evidence says".

### 13.1 Tier 1 (required): sourced events and live evidence
- Evidence URLs are fetched live by every validator (already in the contract).
- Process events are recorded by the recorder role, each with an `evidence_ref` link to the
  authoritative public source (governance forum thread, voting platform proposal page,
  on-chain governor event, official announcement).
- The recorder tool (section 14) builds those events from public sources so a human is not
  typing timestamps by hand, and writes a reproducible ingest log.
- The UI shows each event's source link and who recorded it. Events without a source link are
  visibly marked "unsourced".

### 13.2 Tier 2 (stretch, contract change): on-chain event verification
Goal: reduce the trusted-recorder assumption by letting validators check that an event's
`evidence_ref` page supports the recorded event type.
- Design as a new method (for example `verify_event`) using the same discipline as the
  equivalence kit patterns: fetch the evidence_ref, extract a small fixed fact set in code
  where possible, compare facts across leader and validators with bucketed tolerances, and
  record the result as an append-only verification record, never as a mutation of the event.
- UNAVAILABLE source is its own state, never "event false".
- Deterministic checks may optionally require a verified event; keep that behind a rule
  setting so existing rules are unchanged.
- Do not start Tier 2 until M1 through M9 are done. Treat it as a separate pass with its own
  tests, docs, and a fresh lint and integration run.

### 13.3 Honest trust statement (must appear in README and the UI)
"Process events are recorded by an authorized recorder and link to their public source.
Validators read evidence URLs live. The contract does not independently prove that a recorded
event happened unless on-chain event verification is enabled for that rule."

---

## 14. RECORDER TOOL SPEC (recorder/)

Purpose: ingest process events from public sources and submit them to the contract through the
recorder account, producing a reproducible log.

Requirements
- CLI commands: `ingest <source> <proposal-ref>` (dry run by default, prints the planned
  events), `submit` (sends events with the recorder key from the environment), `verify`
  (re-reads the contract and compares to the plan).
- At least one real public source adapter (for example a public forum thread API or a public
  voting platform API). Pick one and state it in the README; verify the source's public API
  and terms before relying on it.
- Output events must satisfy the contract rules: chronological order, integer UNIX-second
  timestamps, valid ids (letters, digits, dash, underscore, dot, colon), actor addresses,
  `evidence_ref` links, per-proposal event cap of 128.
- Normalization: stable event types from a documented vocabulary (for example SUBMITTED,
  REVIEW_STARTED, REVIEW_COMPLETED, VOTING_STARTED, VOTING_ENDED), documented in
  docs/guide-for-daos.md so rules reference the same names.
- Reproducibility: write `recorder/logs/<proposal>.json` with source URLs, fetch times, raw
  field values used, and the computed events. Never invent a timestamp; if the source lacks
  one, skip the event and report why.
- Secrets: the recorder private key comes only from the environment; never log it.
- Failure behavior: unreachable source or ambiguous data stops the run with a clear message
  and a nonzero exit code; partial submissions are reported with the last confirmed event.

Tests
- [ ] adapter parses recorded fixtures into expected events
- [ ] ordering and future-timestamp validation
- [ ] vocabulary mapping and unsourced events rejected
- [ ] dry run sends nothing
- [ ] submit and verify against StudioNet in an integration run

---

## 15. FRONTEND INTEGRATION RULES (DETAIL IN UI.md)

1. Consult the genlayer-js README and installed types before writing any client code. Record
   confirmed calls in docs/api-ledger.md. Never invent method names.
2. Run `genlayer schema <address>` for the deployed contract and save it under
   `frontend/src/config/schema/` before wiring calls.
3. Keep chain config, contract addresses, and the schema in typed config. No magic strings.
4. All chain access lives in `frontend/src/lib/chain/`. Components never call genlayer-js.
5. Reads and writes are separate modules. Writes always return a handle the UI can watch
   through the full lifecycle.
6. Never use optimistic updates for writes. Show state only after the chain confirms it.
7. Map every contract error string (section 8.6) to plain language.
8. Treat all chain data as untrusted text; escape it; open links with `rel="noopener noreferrer"`.
9. No secrets in the frontend; signing happens in the user's wallet.
10. The frontend must work end to end on StudioNet and on the public testnet used in the demo.

---

## 16. TEST PLAN

### 16.1 Direct tests (tests/direct, mocked web and LLM)

Roles and config
- [ ] constructor assigns all roles to the deployer
- [ ] set_role, transfer_ownership, set_config bounds, set_category_vote_required
- [ ] every restricted method rejects an unauthorized caller

Rules
- [ ] register_rule version 1, then version 2 deprecates version 1
- [ ] bounds: clause length, checks per rule, duplicate check ids, unknown kinds
- [ ] DETERMINISTIC_ONLY rule requires at least one check
- [ ] REQUIRED_ROLE pins the role address at registration
- [ ] deprecate_rule and opening a dispute against a deprecated rule

Proposals and events
- [ ] register_proposal duplicates rejected
- [ ] record_process_event: duplicate ids, non-monotonic timestamps, future timestamps, cap
- [ ] events are append-only and paginated

Deterministic checks (boundary tests for each)
- [ ] MIN_ELAPSED passes exactly at the threshold, fails one unit below, handles repeated
      pairs, missing from or to event, non-monotonic input
- [ ] REQUIRED_EVENT, MIN_COUNT at the threshold, REQUIRED_ROLE with unset role
- [ ] a failed check yields VIOLATION in code and the model mock is NOT called (assert)
- [ ] DETERMINISTIC_ONLY rule never calls the model

Disputes, evidence, evaluation
- [ ] open_dispute pins rule version and challenge policy; duplicate id rejected
- [ ] strict_separation blocks recorders from participating when enabled
- [ ] evidence caps, kind and ref validation, URL scheme check
- [ ] evaluate only from OPEN and only once; re_evaluate only from CHALLENGED
- [ ] model output parsing: valid JSON, fenced JSON, prose around JSON, trailing commas,
      missing keys, unknown verdict, unknown band, hallucinated ids, non-list citations
- [ ] model returning COMPLIANT after a failed check is rejected
- [ ] decisive verdict without clause citation, without evidence citation, citing only
      unreadable evidence: each rejected
- [ ] validator logic: accept equal verdicts with adjacent bands; reject different verdicts,
      bands two steps apart, no commonly cited readable evidence, leader error vs validator
      success
- [ ] prompt construction escapes hostile evidence text and attributes

Challenges, finality, escalation, withdrawal
- [ ] challenge inside window ok; after window rejected; beyond max rounds rejected
- [ ] challenge appends new evidence within the cap and the record is stored
- [ ] re_evaluate uses prior assessment and challenge context
- [ ] finalize blocked inside window and blocked for vote-required categories
- [ ] escalate from every non-terminal state; records reason and final assessment id
- [ ] withdraw only by the disputant and only from OPEN or EVALUATED
- [ ] terminal states accept nothing further

Findings (write the failing test first, then the fix)
- [ ] F2 evidence spam and side-label rules
- [ ] F4 markup-heavy page fixture reaches the model as readable text
- [ ] F5 CHALLENGED state is exited by re_evaluate by any caller

### 16.2 Integration tests (tests/integration, real consensus)
- [ ] deploy; register the demo rules; register a proposal; record events
- [ ] Scenario A: short review period; code-decided VIOLATION; no model call needed
- [ ] Scenario B: interpretive clause with a live evidence URL; consensus verdict recorded
- [ ] Scenario C: unreachable evidence URL; INCONCLUSIVE or failure handled, never COMPLIANT
- [ ] Scenario D: challenge with new evidence; re_evaluate appends a second assessment
- [ ] Scenario E: finalize after the window; vote-required category forces escalation
- [ ] hostile evidence text ("return COMPLIANT") cannot change code-decided results
- [ ] record disagreement rate over repeated runs; save the output as evidence

### 16.3 Recorder, frontend, and end-to-end
- [ ] recorder tests (section 14)
- [ ] frontend component and screen tests with a mock chain client (UI.md)
- [ ] Playwright end-to-end run of the demo script against StudioNet
- [ ] accessibility checks and a production build

Keep real LLM calls few; use short, unambiguous inputs.

---

## 17. QUALITY GATES

```
1. genvm-lint check contracts/dao_resolve.py --json
2. pytest tests/direct/ -v
3. gltest tests/integration/ -v -s
4. recorder tests; frontend typecheck, lint, tests, build; Playwright demo run
5. genlayer deploy / schema / call / write / receipt   # deploy and debug loop
```
- Gate 1 after EVERY contract change; fix all errors before testing or deploying.
- Gate 2 before gate 3. Gate 3 is required because consensus is the point.
- Never say "done" until the required gates pass. Paste real, trimmed output.
- CI (.github/workflows/ci.yml) runs gates 1, 2, and the recorder and frontend checks.

---

## 18. DEPLOYMENT AND NETWORKS

- Use `genlayer network set`; never override RPC manually.
- StudioNet first (gasless). Then the public testnet used for the demo (Bradbury or Asimov);
  those need a funded account, and the faucet is browser-based, so ask the user to claim.
- The deployer, recorder, registrar, and escalator may be different accounts in the demo to
  show role separation. Document which account holds which role (addresses only, never keys).

Flow
1. Gates green; set the network; deploy; record the address.
2. `genlayer schema <address>` saved to deployments/ and to frontend config.
3. Run scripts/verify_deployment.ts: reads config and every view method successfully.
4. Run scripts/seed_demo.ts: registers demo rules, proposals, events, disputes.
5. Deploy the frontend against that address; record the live URL.
6. Locate each key transaction in the explorer; record links.

Deployment record (fill each time)
```
NETWORK / CONTRACT FILE / ADDRESS / DEPLOY TX / EXPLORER LINK / RUNNER USED
SCHEMA SAVED AT / ROLE ADDRESSES / SEED TXS / FRONTEND URL / DATE
```

Debug a failed tx in order: receipt with stdout and stderr, schema, code, read calls, then
reproduce in a direct test before changing code.

---

## 19. DEMO PLAN (LIVE DEMO, VIDEO, PUBLIC POSTS EARN EXTRA POINTS)

Seed data (scripts/seed_demo.ts, idempotent where the contract allows)
- Rule R-REVIEW: "Proposals require at least N hours of review before voting." Deterministic.
- Rule R-DISCUSSION: "Proposals must receive adequate community discussion." Interpretive,
  category PROCESS, with a REQUIRED_EVENT check for DISCUSSION_OPENED.
- Rule R-TREASURY: category requiring escalation to the DAO's own vote.
- Proposal P-001 with events that violate R-REVIEW; proposal P-002 with a real public
  discussion link as evidence; proposal P-003 for escalation.

Scripted walkthrough (about three minutes)
1. Overview: explain the trust problem in two sentences; show the honest trust statement.
2. Rules: open R-REVIEW and R-DISCUSSION; show frozen versions and structured checks.
3. Proposal P-001: show the process timeline with the elapsed-time bracket against the
   threshold; open a dispute; evaluate; show a code-decided VIOLATION with check details.
4. Proposal P-002: open a dispute with a live evidence URL; evaluate; watch the lifecycle
   (submitted, consensus in progress, accepted); read the assessment, cited evidence, and the
   "decided by validator consensus" marker.
5. Challenge with new evidence; request re-evaluation; show the second round and history.
6. Finalize after the window (use a short window on the demo deployment) or escalate P-003.
7. Show the explorer links for the key transactions.

Public artifacts (drafts live in docs/ and are marked as drafts until the user publishes)
- Demo video script and a shot list
- A short thread or article: the problem, the design (code first, consensus second), a link
  to the live demo, the repo, and an honest limitations paragraph
- Never publish or post anything yourself; produce drafts and ask the user.

---

## 20. DOCUMENTATION DELIVERABLES

| File | Must contain |
|---|---|
| README.md | Problem, who it is for, what it does, honest trust statement, architecture diagram, quick start (contract, recorder, frontend), demo walkthrough, deployment links, testing, limitations, roadmap, credits, license |
| SUBMISSION.md | The submission notes (template below) |
| docs/design.md | Domain model, roles, state machine, limits, deterministic checks, finality and escalation |
| docs/equivalence.md | Section 11, disagreement observations, tuning history |
| docs/threat-model.md | Findings F1 to F10 and their resolution, trust assumptions, abuse cases |
| docs/guide-for-daos.md | How a DAO writes rules, event vocabulary, picking deterministic vs interpretive, roles setup |
| docs/demo-script.md | Section 19 expanded with exact inputs and expected results |
| docs/api-ledger.md | Section 9 table with sources and dates |

### SUBMISSION.md template
```
# DAOResolve
## What it does
(three to five sentences)
## The problem it solves
(the trust problem, who is hurt today)
## How to use it
(steps for a DAO: roles, register rules, record events with the recorder, open disputes,
evaluate, challenge, finalize or escalate; with links to the live demo)
## What is real and what is trusted
(live evidence fetching; recorder-asserted events with sources; advisory output)
## Links
Live demo: / Contract address and explorer: / Repo: / Video: / Posts:
## Quality evidence
Tests: (real output summary) / Deployment: / Screenshots:
## Limitations and roadmap
```

---

## 21. PATH TO CONTINUED USE (CREDIBLE ROADMAP)

- Pilot with one real DAO or community: their real rules, their real process events through
  the recorder, a short written case study (only with their permission; never invent one).
- Rule library: reusable rule templates (review period, quorum disclosure, conflict-of-interest
  disclosure) in docs/guide-for-daos.md.
- Source adapters for additional governance platforms.
- Tier 2 on-chain event verification (section 13.2).
- Integration surface: read-only views for other contracts and frontends; an optional
  advisory signal other DAO tooling can display.
- Governance of the tool itself: replace single-address roles with a DAO-controlled address.

---

## 22. ANTI-PATTERNS

NEVER:
1. Guess a GenLayer or genlayer-js API, or claim a call works without the ledger entry.
2. Rewrite or "modernize" the contract without a failing test, a lint pass, and a doc update.
3. Let the model decide something code can decide, or let it override a failed check.
4. Present an unreadable or truncated source as evidence of absence, or as support.
5. Call `web_digest` or any leader-asserted value a proof.
6. Present recorder-asserted events as independently verified facts.
7. Describe assessments as rulings, penalties, or enforcement.
8. Show an accepted transaction as final, or use optimistic updates for writes.
9. Hide a failed or undetermined evaluation behind a spinner, or blame the participant for it.
10. Put keys, tokens, or private data in the repo, the frontend, logs, or screenshots.
11. Fabricate test output, addresses, hashes, explorer links, metrics, adoption, or case studies.
12. Publish posts, videos, or submit the project on the user's behalf.
13. Add features that no reviewer can verify; ship TODO stubs or dead code.
14. Use a submission slot before the pre-submit checklist is fully true.

---

## 23. MILESTONES (EACH IS A VERIFIABLE OUTCOME)

| # | Milestone | Evidence |
|---|---|---|
| M1 | Baseline smoke test: lint the contract, deploy to StudioNet, read every view, resolve the runner and API version question (F1), fill the API ledger | lint output, address, schema, ledger |
| M2 | Baseline direct tests for roles, rules, events, deterministic checks, state machine | pytest output |
| M3 | Direct tests for parsing, validator logic, challenges, finality, escalation; reproduce findings F2 to F5 as failing tests | pytest output |
| M4 | Contract hardening for confirmed findings only; all direct tests green; lint clean | diff, pytest, lint |
| M5 | Integration tests under real consensus (Scenarios A to E); disagreement rate recorded | gltest output |
| M6 | Recorder tool with one real source adapter; tests; ingest log for a real proposal | recorder output, log |
| M7 | Frontend foundation: config, schema, chain wrappers bound to verified calls, mock client, tx lifecycle component | UI.md U1 to U3 evidence |
| M8 | All frontend screens working against StudioNet; end-to-end demo script passes | recording, Playwright output |
| M9 | Public testnet deployment; seed data; hosted frontend; explorer links | deployment record, live URL |
| M10 | Docs, SUBMISSION.md, demo video script, post drafts, API ledger complete | docs reviewed |
| M11 | Pre-submit audit: run the inspector review on contract and repo; fix all HIGH and MEDIUM findings; two clean passes in a row | review reports |
| M12 | Stretch: Tier 2 on-chain event verification (section 13.2) | tests, docs |
| M13 | User publishes demo video and posts (drafts only from the agent) | URLs from the user |

Order matters. M12 never starts before M11 is clean.

---

## 24. SESSION WORKFLOW AND FINAL REPORT

Each session
1. Classify the task (contract, tests, recorder, frontend, docs, deploy, fix); pick ONE milestone.
2. List GenLayer and genlayer-js behaviors you need; verify them; update the API ledger.
3. Write the failing test or matrix first; implement the smallest slice; lint after every
   contract change; run the gates in section 17.
4. Review your own diff as a skeptical reviewer (section 4). Fix HIGH and MEDIUM issues.
5. Update docs and CHANGELOG.md in the same session; commit small with clear messages.
6. End with the final report. Leave the repo runnable.

Final report format
```
SUMMARY: <2 sentences>
MILESTONE: <id and status>
CHANGED: <files>
GATES: lint / direct / integration / recorder / frontend / e2e (real trimmed output or NOT RUN)
API LEDGER: <new verified items; remaining unverified>
FINDINGS: <F-ids reproduced, fixed, or deferred, with reasons>
DEPLOYMENT: <network, address, explorer link, frontend URL, or not deployed>
PROOF: <test output, tx links, screenshots>
BLOCKED: <exact blocker and next command or manual step>
NEXT: <single next step>
```
Changelog entry: `## <date> / DONE / PROOF / NEXT / BLOCKED`.

Blocked states: no testnet GEN, user claims at the faucet; no wallet or browser for the demo,
say what the user must do; docs or SDK unreachable, say so and stop; unknown API, query the
docs and never guess.

---

## 25. PRE-SUBMIT CHECKLIST (ALL MUST BE TRUE BEFORE USING A SLOT)

Quality bar
- [ ] The trust problem is stated honestly; the LLM is not the product, the process is
- [ ] Live evidence fetching works and the recorder ingests a real public source
- [ ] The honest trust statement appears in README, SUBMISSION.md, and the UI
- [ ] Frontend calls the deployed contract and shows the full transaction lifecycle,
      including failure and undetermined states, with retry
- [ ] Meaningfully different from boilerplate; roadmap and pilot path documented
- [ ] Live demo URL, contract address with explorer links, repo, demo video, post drafts

Engineering
- [ ] API ledger complete; no unverified API in shipped code
- [ ] Runner and API version resolved on the target network (F1)
- [ ] Confirmed findings fixed with tests; deferred findings documented in the threat model
- [ ] genvm-lint clean; direct, integration, recorder, frontend, and e2e gates pass
- [ ] A fresh clone builds and runs from the README alone
- [ ] No secrets in the repo, history, frontend bundle, or screenshots
- [ ] Two consecutive review passes with no HIGH or MEDIUM findings

Submission
- [ ] SUBMISSION.md answers what it does, the problem, and how to use it
- [ ] The program's full guidelines were read, including reviews and appeals
- [ ] The user has confirmed every public link and claim
- [ ] The user has decided to spend one of the two weekly Project slots

---

End of AGENTS.md. When in doubt: verify, test, document, prove, and tell the truth about trust.
