# Changelog

All notable changes to DAOResolve are recorded here.

## 2026-10-20 (fifth review response)

DONE:
- Checked an external pros/cons review against the current source. Most of its
  findings were already closed: `MIN_ELAPSED` evaluates every matching interval
  (`pairs=N`), `REQUIRED_ROLE` pins the role address per rule version, prompt
  event truncation is reported with totals and type counts, `claim_text` is
  labelled unverified and cannot be cited, page drift is tested, failed
  consensus is distinguished from `INCONCLUSIVE`, and two sample DAOs are
  documented.
- Fixed the two findings that were still open:
  - **Citations proved an id, not support (review items: "evidence citations do
    not guarantee evidence quality", "external evidence can be unstable")** —
    each interpretation run now rejects a decisive verdict that cites only
    evidence it could not read (`LLM_ERROR: decisive verdict cites no readable
    evidence`), and consensus requires a shared citation that **both** runs
    could read. `INCONCLUSIVE` stays exempt, because a finding of insufficiency
    may rest on unreadable sources. This closes the case where a verdict cites
    a URL that returned 503 and still looks sourced.
  - **Failed check versus governance violation (review item: "a deterministic
    failure automatically means VIOLATION")** — every assessment now reports
    `decided_by`: `DETERMINISTIC_CHECKS` when a check failed or the pinned rule
    is `DETERMINISTIC_ONLY`, otherwise `INTERPRETATION`. It is derived at read
    time from the recorded fail count and the pinned rule version, so it cannot
    drift from the stored checks and needs no new storage.
- Prompt changes: a decisive verdict may not cite evidence marked
  `available="false"`; during re-evaluation the prior assessment is labelled a
  prior opinion rather than ground truth, so a persuasive challenge can correct
  it without the model deferring to its earlier answer.
- Documentation: `docs/equivalence.md` (readability invariant and failure
  behavior), `docs/threat-model.md` (new "unsupported but well-formed
  citations" threat), `docs/design.md`, `docs/domain-model.md`, `docs/api.md`,
  `docs/testing.md`, `docs/deployment.md`, and `README.md`.
- Contract: 1,463 lines, lint clean (3 checks, 28 methods, 16 write / 12 view).

PROOF:
- `GENVM_VERSION=v0.3.0-rc7 genvm-lint check contracts/dao_resolve.py --json`
  -> `{"ok":true,"lint":{"ok":true,"passed":3},"validate":{"ok":true,...}}`
  (28 methods, 1,463 lines).
- `python3.12 -m pytest tests/direct/ -q` -> `171 passed in 5.89s` (4 new tests:
  decisive verdict citing only unreadable evidence rejected; evidence readable
  in only one run rejected; `INCONCLUSIVE` exempt from the readability floor;
  end-to-end rejection stores nothing and leaves the dispute `OPEN`).
- `gltest tests/integration/ -v -s --network studionet` -> `3 passed in 209.44s`
  against the current source. On-chain read-back shows
  `decided_by: 'INTERPRETATION'` for `D2#a1`/`D2#a2` and
  `decided_by: 'DETERMINISTIC_CHECKS'` for `D1#a1`; consensus was reached under
  the readability floor without retries. Test contract addresses and hashes are
  in `deployments/studionet.md`.

NEXT:
- Redeploy the canonical contract to StudioNet, then refresh
  `deployments/studionet.md` and `deployments/studionet.schema.txt`.

BLOCKED:
- The canonical StudioNet deployment
  (`0xDD29Ae63f12Fbb586551251eDeb94B51aC666DfA`) still runs the previous source.
  The integration suite exercised the current source on throwaway deployments,
  so the on-chain code at that address does not match the working tree until
  redeployment.

## 2026-10-20 (fourth review response)

DONE:
- Worked through an external code review of the contract and closed the
  findings that were still open:
  - **External evidence drift (review item: "External URLs are fetched
    separately during interpretation")** — every assessment now stores
    `web_digest`: a bounded (512 char) fingerprint of the evidence the leader
    actually read (`evidence_id=length:prefix`, or `evidence_id=UNAVAILABLE`).
    It is an audit artifact, not a consensus input, and it is HTML-escaped so
    it can never break out of a delimiter. Leader and validator still fetch
    independently, so the fingerprint makes divergence visible instead of
    hiding it. Documented in `docs/equivalence.md`, `docs/design.md`, and
    `docs/threat-model.md`.
  - **Adversarial challenge tests (review item: "Challenges do not necessarily
    resolve the original problem")** — new direct tests cover a challenge with
    no reason and no evidence (rejected), irrelevant challenge evidence (a
    deterministic verdict is unchanged and no model is called), contradictory
    evidence (re-evaluation can end `INCONCLUSIVE`), and a persuasive
    correction (re-evaluation can flip the verdict while the first assessment
    stays in history).
  - **Page drift between fetches (review item: "test the behavior when the two
    interpretations receive different external responses")** — two new tests
    swap the web mock between the leader's fetch and the validator's re-fetch:
    the same verdict under changed content still reaches consensus, a changed
    verdict under changed content is rejected.
  - **Failed consensus is not an inconclusive verdict (review item 2)** — a new
    test shows a failed evaluation stores nothing, leaves the dispute `OPEN`,
    and a later `evaluate_dispute` succeeds. Documented in README and
    `docs/equivalence.md`.
  - **Zero-evidence decisive verdicts (review item: "decide whether that is
    intentional")** — the policy is now explicit and tested: with no evidence
    ids at all, citing the pinned rule is sufficient, because recorded events
    can decide an interpretive clause. When evidence ids exist, a decisive
    verdict must cite one and leader and validator must share a cited id.
  - **Reuse (review item: "at least two sample DAO rules and example
    disputes")** — `docs/examples.md` now walks through two complete sample
    DAOs (a grants council with quorum and community-discussion rules, and a
    treasury payments DAO with timing and disclosure rules), each with the
    expected assessment, the challenge outcome, and the escalation path.
  - **README** rewritten against the real repository state: a "How consensus is
    used" section, the reuse section, verified status, and the removal of
    links to documents that do not exist.
- Contract stays within the 1,400-line budget: 1,397 lines, lint clean
  (3 checks, 28 methods, 16 write / 12 view).

PROOF:
- `GENVM_VERSION=v0.3.0-rc7 genvm-lint check contracts/dao_resolve.py --json`
  -> `{"ok":true,"lint":{"ok":true,"passed":3},...}` (28 methods, 1,397 lines).
- `pytest tests/direct/ -q` -> `167 passed in 6.05s`.
- `gltest tests/integration/ -v -s --network studionet` -> `3 passed in 270.07s`.
- Redeployed to StudioNet: contract
  `0xDD29Ae63f12Fbb586551251eDeb94B51aC666DfA`, deploy tx
  `0x3157b6a8137b74a162afcfbb288da91bd635062e0d7feaac60179aa3762c9f66`
  (receipt `FINALIZED`, `MAJORITY_AGREE`). Schema saved to
  `deployments/studionet.schema.txt` (242 lines).
- On-chain evidence for the new field: dispute `D2` on the deployed contract
  stored `verdict: 'INCONCLUSIVE'`, `cited_evidence_ids: [ 'D2#e1' ]`,
  `web_digest: 'D2#e1=3012:&lt;!DOCTYPE ht'`; the deterministic dispute `D1`
  stored `web_digest: ''` and finalized with `final_assessment_id: 'D1#a1'`.
- Real consensus under the integration suite stored
  `web_digest: 'D2#e1=189:The DAO foru;D2#e2=63:The author r'` on the
  re-evaluation.

NEXT:
- Optional: retry Bradbury or Asimov with a funded account and faucet claim.

BLOCKED:
- Bradbury testnet deploy attempt rejected by the node with `gas limit too high`
  (`eth_sendRawTransaction`); no transaction was confirmed and no funds were
  spent. StudioNet remains the verified public deployment.

## 2026-10-19 (third review response)

DONE:
- Addressed the third external review's highest-value findings:
  - `MIN_ELAPSED` now checks every `to_event_type` against the latest
    preceding `from_event_type` and passes only when every interval meets the
    threshold. A vote recorded before any submission fails explicitly; the
    detail reports `pairs=N` for multi-interval cases.
  - `REQUIRED_ROLE` now pins the role address in the rule version at
    registration time. Rotating a role no longer reinterprets old events;
    publish a new rule version to adopt a new address. A rule registered while
    a role was unset stays failed until a new version is published.
  - Validator consensus now requires leader and validator to share at least one
    cited evidence id for a decisive verdict, so two runs cannot agree while
    relying on disjoint evidence.
  - The prompt labels `claim_text` as the disputant's unverified assertion and
    reports total, shown, truncation, and event-type counts for events.
  - Deterministic reasoning now states that it is an assessment against the
    registered rule version, not a finding about the whole process.
- Documentation: design, equivalence, threat model, README, and deployment record
  refreshed for the new semantics, citation limits, role pinning, and omitted-event
  reporting.
- Contract: 1,395 lines, lint clean (3 checks, 28 methods, 16 write / 12 view).
- Direct tests: 157 passed. New tests cover repeated voting starts, latest-preceding
  submission, vote before submission, role pinning and rotation, zero-role pinning,
  disjoint/overlapping evidence citations, claim unverified prompt text, and
  truncated-event reporting.
- Integration tests: 3 passed on StudioNet (consensus round trip, end-to-end
  deterministic evaluation, invalid transition).
- Redeployed to StudioNet: `0xbc0B3C5286e36162e7535480BAB9E0733D1aFFBd`,
  deploy tx `0xcdd69d54388ca823fb4744111e9f84efee2c5314991bf08c5549b6227c1d97ab`.
  Schema saved to `deployments/studionet.schema.txt` (239 lines). A write flow
  (set_config, register_rule, register_proposal, record events, open_dispute,
  evaluate_dispute) returned `MAJORITY_AGREE`; read-back shows `COMPLIANT` with
  `elapsed=100 threshold=100`.

PROOF:
- `GENVM_VERSION=v0.3.0-rc7 genvm-lint check contracts/dao_resolve.py --json`
  -> `{"ok":true,"lint":{"ok":true,"passed":3},...}` (28 methods, 1,395 lines).
- `pytest tests/direct/ -q` -> `157 passed in 5.87s`.
- `gltest tests/integration/ -v -s --network studionet` -> `3 passed`.
- StudioNet deploy tx
  `0xcdd69d54388ca823fb4744111e9f84efee2c5314991bf08c5549b6227c1d97ab`;
  contract `0xbc0B3C5286e36162e7535480BAB9E0733D1aFFBd`; read-back
  `status: EVALUATED`, `verdict: COMPLIANT`, `detail: elapsed=100 threshold=100`.

NEXT:
- Optional: retry Bradbury or Asimov with a funded account and faucet claim.

BLOCKED:
- Bradbury testnet deploy attempt rejected by the node with `gas limit too high`
  (`eth_sendRawTransaction`); no transaction was confirmed and no funds were
  spent. StudioNet remains the verified public deployment.

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
