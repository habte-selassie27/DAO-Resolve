# UI.md — DAOResolve Frontend Spec

> Companion to AGENTS.md. AGENTS.md wins on any conflict about contract behavior or scope.
> Audience: any coding agent building the DAOResolve frontend.
> Submission bar: the frontend must genuinely call the contract and handle the FULL
> transaction lifecycle, including failure. A strict reviewer will click everything.
> Rule zero: never guess a genlayer-js method. Verify it first (AGENTS.md section 6.1).

---

## 1. PURPOSE AND SCOPE

The UI exists to make three things legible to a stranger in about two minutes:
1. What the rule says and how the process actually unfolded (the process rail).
2. Who or what decided the verdict: a code check, or validator consensus on live evidence.
3. How final the result is: accepted, challengeable, finalized, or escalated.

Screens (routes)
| Route | Screen | Main audience |
|---|---|---|
| `/` | Overview | Everyone, first impression |
| `/rules`, `/rules/:ruleId` | Rules | DAO members, registrar |
| `/proposals`, `/proposals/:proposalId` | Proposals and process | DAO members, recorder |
| `/disputes`, `/disputes/:disputeId` | Disputes (the core screen) | Disputants, challengers, reviewers |
| `/admin` | Roles and policy | Owner |
| `/how-it-works` | Trust model and demo guide | Reviewers |

Create flows (register rule, record event, open dispute, challenge, escalate) are side
sheets or dialogs on these screens, not extra routes.

Out of scope: voting, token or treasury features, notifications, user profiles,
leaderboards, anything that reads as a penalty on a person.

---

## 2. UI INVARIANTS (TIED TO THE CONTRACT)

1. The UI never recomputes or overrides a verdict. It renders the contract's values.
2. Every assessment shows `decided_by`: "Rule check" (code decided) or "Validator
   consensus" (interpretation). They look different and read differently.
3. A failed or undetermined evaluation is NOT a verdict. It has its own style, wording, and
   place, and offers a retry. It never appears in the verdict slot.
4. "Inconclusive" is a real verdict about the evidence, not a failure of the system.
5. Accepted is never shown as final. Final means the contract's `is_final` or FINALIZED
   status, and it is labeled as the contract's own advisory record.
6. Advisory wording everywhere: "assessment against rule version N". Never "ruling",
   "penalty", "guilty", or "enforced".
7. Evidence `side` labels are shown as "self-declared". Events show who recorded them and
   their source link; events without a source link are marked "unsourced".
8. Leader-asserted values (the fetch fingerprint, the validator note) are labeled
   informational and never styled as proof.
9. Writes use no optimistic updates. Data changes on screen only after the chain confirms.
10. Reads and writes look and behave differently (section 11).
11. Chain data is untrusted text: escaped, never inserted as HTML; links open with
    `rel="noopener noreferrer"` and show the full URL on hover or focus.
12. No signing keys in the frontend. Signing happens in the user's wallet.

---

## 3. DESIGN PLAN

### 3.1 Subject, audience, job
- Subject: governance process and disputes about it.
- Audience: DAO members who need to judge a claim fairly, and reviewers testing the app.
- Primary job: read the rule, see the process, see the evidence, see who decided, see how
  final it is.

### 3.2 Concept
A chamber record. The signature element is the **process rail**: a timeline of recorded
events as nodes on a rail, with the rule's structured checks drawn on top of it as brackets,
markers, and counters. A review-period check appears as a bracket between two events with the
elapsed time and the required threshold side by side, so a code-decided violation is visible at
a glance. Everything else stays quiet so the rail carries the meaning.

### 3.3 Color (named roles, dark default with a light variant)
Dark theme (default)
| Name | Hex | Role |
|---|---|---|
| Midnight | #14172B | Page background (deep indigo, not neutral black) |
| Panel | #1D2140 | Panels and rows |
| Line | #343A66 | Borders, rails, dividers |
| Paper ink | #E8EAF6 | Text |
| Muted ink | #A4A9CC | Secondary text (verify contrast) |
| Signal | #F2B544 | Primary action, focus ring, links |
| Compliant | #4FD1B5 | Compliant verdict |
| Violation | #FF7B8E | Violation verdict |
| Inconclusive | #AAB1D6 | Inconclusive verdict |
| System | #8D93BD | Evaluation failed and neutral system states (striped fill) |

Light theme (prefers-color-scheme: light)
| Name | Hex |
|---|---|
| Midnight to Mist | #F3F4FA background |
| Panel | #FFFFFF |
| Line | #CBD0E8 |
| Paper ink | #1A1D3A |
| Muted ink | #565B85 |
| Signal | #9A5B00 for text and focus; #3B3FC4 for filled primary buttons |
| Compliant | #137A62 |
| Violation | #B3243F |
| Inconclusive | #5A6290 |
| System | #666C93 |

Rules
- State is never conveyed by color alone: icon shape, word, and fill pattern all differ.
- "Evaluation failed" uses System with a diagonal-stripe fill and never an outcome color.
- Verify every pair for contrast: text 4.5:1 or better, graphical marks and focus 3:1.
- Define tokens as CSS variables on `:root` and redefine them for light; give `body` an
  explicit background.

### 3.4 Typography
| Role | Face | Notes |
|---|---|---|
| Interface and body | Hanken Grotesk | Clear and sturdy; tabular numerals for times and counts |
| Rule text, assessment statements, page titles | Literata | Reads like minutes of a meeting; slightly looser line height |
| Addresses, hashes, ids | system monospace | Only inside copy chips |

- Load via Google Fonts with real fallbacks (system-ui; Georgia; ui-monospace).
- Scale (1.2 ratio): 12 / 14 / 16 / 19 / 23 / 28 / 34; body 16; line length under 80.
- Sentence case. No all-caps labels, no tracked-out eyebrows.

### 3.5 Layout
```
+-------------------------------------------------------------------------+
| DAOResolve   Rules  Proposals  Disputes  How it works     [Network][Acct]|
+-------------------------------------------------------------------------+
| Dispute d-014                              Assessed, can be challenged  |
| Rule R-REVIEW v2 (pinned)    Proposal P-001    Opened by 0x12..9f        |
|-------------------------------------------------------------------------|
| Process                                                                 |
|  o submitted ----[ elapsed 6h  <  required 24h ]---- o voting started   |
|  src:forum#12                                        src:vote#7         |
|-------------------------------------------------------------------------|
| Assessment (round 1)  Violation   Decided by: Rule check                |
|   checks: min_review FAIL elapsed=21600 threshold=86400                 |
| Evidence (self-declared sides)      Challenge window closes in 23h      |
+-------------------------------------------------------------------------+
```
- One content column up to 1200px, left aligned. Panels and rows, not identical gradient cards.
- Radius is deliberate: 2px on fields and rows, 8px on sheets and dialogs, none on rails.
- One border weight, one subtle elevation for sheets and dialogs only.

### 3.6 Principles
- The rail is the one bold element.
- Evidence sits beside verdicts. Deciding code sits beside deciding consensus.
- Plain words first; identifiers second.
- Honest about trust: recorder, sources, and limits are always visible.

### 3.7 Rejected defaults (keep it that way)
Warm cream plus terracotta, near-black plus acid green, broadsheet hairline columns,
identical rounded cards with gradient washes, all-caps eyebrow labels, middle-dot meta
strings, arrows appended to buttons, monospace on every small label. Revert any change that
brings them back.

---

## 4. STACK AND STRUCTURE

Recommended (adjust to the repo): Vite, React, TypeScript, React Router, TanStack Query for
reads, plain CSS with variables, genlayer-js (verified calls only), Vitest and React Testing
Library, Playwright. Host on any static host.

```
frontend/
  index.html  package.json  .env.example
  src/
    main.tsx
    app/ (App, routes, shell/)
    config/
      networks.ts            # typed chain config (StudioNet, public testnet)
      contracts.ts           # address per network
      schema/                # saved `genlayer schema <address>` output
    lib/
      chain/
        clients.ts           # read client and wallet-signed write client
        reads.ts             # app-level read functions (section 7)
        writes.ts            # app-level write functions returning TxHandle
        tx.ts                # lifecycle watcher (section 10)
      errors.ts              # contract error string -> user message (section 12)
      roles.ts               # derive roles from config + account
      format.ts              # times, durations, addresses, ids
      mock/                  # mock chain client and fixtures (section 15)
    domain/
      types.ts               # view models (section 6)
      copy.ts                # copy deck lookups (section 13)
    screens/ (Overview, Rules, Proposals, Disputes, Admin, HowItWorks)
    components/ (see section 9)
    styles/ (tokens.css, base.css)
  tests/
```

Hard rules
- Components never import genlayer-js. Only `lib/chain/` does.
- `lib/chain/` functions bind to VERIFIED calls only. Mark unverified bindings with
  `TODO(verify-genlayer-js)` and do not ship them.
- Config (chain, address, schema) is typed and loaded from one place.

---

## 5. WALLET, NETWORK, ROLES

- Follow the genlayer-js README's browser dApp pattern: a read-only client for reads (no
  wallet) and a wallet-signed client for writes. Verify the exact wallet connection steps.
- Network badge in the top bar shows the active network and a warning on a wrong or
  unsupported one, with a clear fix. Writes are blocked on the wrong network.
- Account chip shows the short address with a copy chip and the user's roles.
- Roles come from `get_config` (owner, rule_registrar, recorder, escalator) compared with the
  connected account. The contract is the authority; the UI only explains.
- Disabled actions are shown with a reason ("Only the recorder can record events") instead
  of being hidden, so reviewers can see the full surface.
- No account connected: reads work; writes show "Connect an account to continue".

---

## 6. VIEW MODELS (FIELD NAMES COME FROM THE CONTRACT'S VIEW METHODS)

```ts
type DisputeStatus =
  "OPEN" | "EVALUATED" | "CHALLENGED" | "RE_EVALUATED" | "FINALIZED" | "ESCALATED" | "WITHDRAWN";
type Verdict = "COMPLIANT" | "VIOLATION" | "INCONCLUSIVE";
type Band = "LOW" | "MEDIUM" | "HIGH";
type DecidedBy = "DETERMINISTIC_CHECKS" | "INTERPRETATION";

interface CheckResult { check_id: string; kind: string; result: "PASS" | "FAIL"; detail: string }
interface Assessment {
  assessment_id: string; dispute_id: string; round: number;
  verdict: Verdict; confidence_band: Band; reasoning_digest: string;
  produced_by: "EVALUATION" | "RE_EVALUATION"; created_at: number;
  deterministic_pass_count: number; deterministic_fail_count: number;
  deterministic_results: CheckResult[]; cited_clause_ids: string[]; cited_evidence_ids: string[];
  web_digest: string; decided_by: DecidedBy; is_final: boolean;
}
interface Dispute {
  dispute_id: string; rule_id: string; rule_version: number; proposal_id: string;
  disputant: string; claim_text: string; status: DisputeStatus; challenge_count: number;
  challenge_window: number; max_rounds: number; opened_at: number; last_assessment_at: number;
  last_challenge_at: number; challenge_deadline: number; escalated_by: string;
  escalation_reason: string; closed_at: number; final_assessment_id: string; is_final: boolean;
  evidence_count: number; assessment_count: number; latest_assessment: Assessment | {};
}
interface Rule {
  rule_id: string; version: number; title: string; clause_text: string; category: string;
  interpretation: "DETERMINISTIC_ONLY" | "NEEDS_INTERPRETATION"; status: "ACTIVE" | "DEPRECATED";
  registered_by: string; registered_at: number; supersedes_version: number;
  structured_checks: { check_id: string; kind: string; event_type: string;
    from_event_type: string; to_event_type: string; threshold: number;
    role: string; role_address: string }[];
}
interface ProcessEvent { event_id: string; event_type: string; actor: string;
  timestamp_ref: number; evidence_ref: string; recorded_by: string }
interface Evidence { evidence_id: string; submitted_by: string; side: "DISPUTANT" | "RESPONDENT" | "NEUTRAL";
  kind: "URL" | "EVENT_REF" | "TEXT_STATEMENT"; ref: string; submitted_at: number }
interface Challenge { challenge_id: string; challenger: string; reason: string; round: number;
  new_evidence_count: number; created_at: number }
interface Config { owner: string; rule_registrar: string; recorder: string; escalator: string;
  challenge_window: number; max_challenge_rounds: number; strict_separation: boolean;
  vote_required_categories: string[]; limits: Record<string, number> }
```
Rules
- Confirm field names and return shapes against the saved schema and a real read before use;
  decoding of dict and list returns (plain object vs Map) is unverified, so normalize in
  `lib/chain/reads.ts` and test it.
- Unknown enum values render neutral ("Unknown state") with a console warning; they never crash.
- Times are UNIX seconds from the contract. Format in the user's locale with the UTC time on
  hover. Countdowns use the local clock and say "about"; the contract is the authority.

---

## 7. APP-LEVEL CHAIN FUNCTIONS (NAMES ARE THE APP'S OWN)

Reads (all paginated reads cap at 50)
```ts
getConfig(); listActiveRules(offset, limit); getRule(ruleId); getRuleVersion(ruleId, v);
getProposal(id); getEvents(proposalId, offset, limit);
listDisputes(offset, limit); getDispute(id); getDisputeStatus(id);
getEvidence(id, offset, limit); getAssessmentHistory(id, offset, limit); getChallenges(id, offset, limit);
```
Writes (each returns a TxHandle the UI can watch)
```ts
registerRule({ruleId,title,clauseText,category,interpretation,checks[]});  // checks sent as a JSON array string
deprecateRule(ruleId);
registerProposal({proposalId,contentRef,statusNote});
recordProcessEvent({proposalId,eventId,eventType,actor,timestampRef,evidenceRef});
openDispute({disputeId,ruleId,proposalId,claimText});
submitEvidence({disputeId,side,kind,ref});
evaluateDispute(id); reEvaluate(id);
challengeAssessment({disputeId,reason,newEvidence[]});   // new evidence sent as a JSON array string; "[]" for none
finalizeDispute(id); escalateDispute({disputeId,reason}); withdrawDispute(id);
setRole({role,account}); transferOwnership(account);
setConfig({challengeWindow,maxChallengeRounds,strictSeparation}); setCategoryVoteRequired({category,required});
```
Each wrapper binds to a VERIFIED genlayer-js call (AGENTS.md 6.1). Argument encoding for the
contract's integer types is unverified: test with the schema and a real transaction on
StudioNet before relying on it.

Client-side validation mirrors the contract (the contract stays the authority)
| Field | Limit |
|---|---|
| ids (rule, proposal, dispute, event, check) | 1 to 64 chars, letters, digits, `-` `_` `.` `:` |
| title | 120 chars |
| clause text, claim text | 2000 chars |
| challenge reason, escalation reason | 1000 chars |
| status note | 280 chars |
| evidence ref | URL up to 512 chars (http or https), text statement up to 2000, event ref as an id |
| structured checks | at most 12 per rule, JSON up to 8000 chars |
| events | at most 128 per proposal; chronological; timestamp not more than one day ahead |
| evidence | at most 32 per dispute |
| challenge window | 60 to 2592000 seconds; rounds 0 to 10 |

Generate unique ids in the UI for disputes and events (human prefix plus a short random
suffix) and handle "already exists" gracefully.

---

## 8. SCREENS

### 8.1 Overview (`/`)
- Two-sentence trust problem and one-line product statement.
- The honest trust statement (AGENTS.md 13.3) in a visible panel, not a footnote.
- Live stats read from the contract: rules, proposals, disputes by status.
- Recent disputes list with status and decided-by markers.
- "Try the guided demo" opens the seeded dispute pages on the live deployment.
- Empty state (no data yet): "No disputes yet. Register a rule and a proposal to begin."

### 8.2 Rules (`/rules`, `/rules/:ruleId`)
List: title, category, interpretation mode label, version, status. Filters: category, status.
Detail
- Clause text in the serif face, with version history (supersedes links) and a pinned-version
  note: "Disputes use the version that was active when they opened."
- Structured checks drawn as the same overlays used on the process rail (section 9) with a
  plain sentence under each ("Voting may start no sooner than 24 hours after submission").
- Interpretation label: "Checked by code" (DETERMINISTIC_ONLY) or "Code first, then
  validators interpret what code cannot" (NEEDS_INTERPRETATION).
- Category chip; if the category requires a DAO vote, a notice: "Disputes in this category
  are escalated to the DAO's own procedure instead of being finalized here."
Register rule (side sheet, registrar or owner)
- Fields: rule id, title, clause text, category, interpretation.
- Checks builder by kind with only the fields that kind needs:
  | Kind | Plain label | Fields |
  |---|---|---|
  | MIN_ELAPSED | Minimum time between two events | from event type, to event type, threshold seconds (positive) |
  | REQUIRED_EVENT | An event must exist | event type |
  | MIN_COUNT | At least N events | event type, threshold (positive) |
  | REQUIRED_ROLE | A role must have acted | event type, role (rule registrar, recorder, or escalator) |
- Warn before submitting: "Registering an existing rule id publishes a new version and
  deprecates the previous one. Existing disputes keep the version they were opened under."
- A DETERMINISTIC_ONLY rule requires at least one check; enforce in the form.
- Deprecate action with a confirmation that explains the effect.

### 8.3 Proposals (`/proposals`, `/proposals/:proposalId`)
List: proposal id, status note, event count, created by.
Detail
- Proposal link and status note.
- THE PROCESS RAIL for the proposal's events. Optional rule selector overlays the checks of a
  chosen rule version so the user sees how the process measures up before disputing.
- Event table below the rail: type, actor, time, recorded by, source link or an "unsourced"
  marker.
Register proposal and record event (recorder or owner)
- Event form: event id (generated), type (suggest the documented vocabulary, allow custom),
  actor address, time (date and time picker converted to UNIX seconds), evidence ref link.
- Enforce chronological order against the last event; show why when blocked.
- Show the note: "Events are recorded by an authorized recorder. Link each event to its
  public source."
Open dispute button here prefills proposal and lets the user pick a rule.

### 8.4 Disputes (`/disputes`, `/disputes/:disputeId`)
List: id, rule and version, proposal, status badge, challenge count, latest verdict if any.
Filters: status, rule, my disputes.
Detail (the core screen), in this order
1. Header: id, status, finality banner (section 9, FinalityBanner), pinned rule card, proposal
   link, disputant, opened time, claim text labeled "Disputant's claim (unverified)".
2. Process rail for the proposal with the pinned rule's checks overlaid, using the deterministic
   results of the latest assessment to color each overlay (pass or fail).
3. Evidence: three groups by self-declared side. Each item shows kind, reference (URL opens
   safely), submitter, time. Counter "n of 32 used". Submit evidence form while allowed.
   Note: "Evidence added after an assessment is considered at the next re-evaluation."
4. Assessment (latest, with rounds listed newest first):
   - Verdict badge and confidence band. Plain sentence from the copy deck.
   - Decided-by badge: "Rule check" or "Validator consensus" with a one-line explanation.
   - Deterministic results table: check id, kind, pass or fail, detail string.
   - Cited clause and cited evidence chips that scroll to the evidence items.
   - "Validator note" (reasoning digest), labeled informational and not compared in consensus.
   - "Fetch fingerprint" (web digest) in a disclosure, labeled informational and leader-asserted.
5. Challenges: list with reasons and new evidence counts per round.
6. Actions bar (contextual; disabled with a reason when not allowed):
   | Status | Actions |
   |---|---|
   | OPEN | Submit evidence, Request assessment, Withdraw (disputant) |
   | EVALUATED, RE_EVALUATED | Submit evidence, Challenge, Finalize (after the window), Escalate (escalator), Withdraw (EVALUATED only, disputant) |
   | CHALLENGED | Request re-evaluation (anyone), Escalate (escalator) |
   | FINALIZED, ESCALATED, WITHDRAWN | None; show the closing record |
   - Finalize explains when it opens: "Opens when the challenge window closes (about <time>)."
   - Finalize on a category that requires a vote shows: "This category requires escalation to
     the DAO's own procedure." and offers Escalate instead.
   - Request re-evaluation explains: "A challenge was filed. Anyone can ask validators to
     assess again."
Open dispute (side sheet or dialog)
- Choose proposal and rule (active versions only), write the claim (counter), see the
  pinned-version note, and a preview of the process rail against the rule before submitting.
- Unique id generated; "already exists" handled with a regenerate.
Challenge dialog: reason (required, counter), optional new evidence rows (side, kind, ref),
remaining rounds, window time left, and the sentence: "A challenge adds a new assessment
round. Earlier results are never erased."
Escalate dialog (escalator): reason; states clearly that escalation hands the dispute to the
DAO's own process and the contract takes no further action.

### 8.5 Admin (`/admin`, owner only; read-only view for others)
- Current roles with addresses; assign or revoke a role (zero address revokes), transfer
  ownership with a typed confirmation.
- Policy: challenge window and max rounds (bounds shown), strict separation toggle with an
  explanation, categories that require a DAO vote.
- Note: "Policy changes apply to new disputes. Existing disputes keep the policy they opened
  under."
- Non-owners see the same page read-only with a "Not available to your account" banner.

### 8.6 How it works (`/how-it-works`)
- The trust model in plain steps (these are real sequential steps, so a numbered list is right):
  rules are registered, events are recorded with sources, a dispute is opened, code checks
  run first, validators interpret what code cannot, the result can be challenged, then
  finalized or escalated.
- "What is real and what is trusted" table mirroring SUBMISSION.md.
- Links to the contract on the explorer, the repo, the demo video, and the demo script.

---

## 9. COMPONENTS

| Component | Responsibility | Key rules |
|---|---|---|
| ProcessRail | Signature timeline of events with check overlays | Variants below; text alternative table always present |
| CheckOverlay | One structured check drawn on the rail | Pass, fail, or not evaluated; shows integer values and units |
| VerdictBadge | Compliant, violation, inconclusive | Icon + word + color; never used for failed evaluations |
| DecidedByBadge | Rule check vs validator consensus | Different shape and wording |
| EvaluationFailureNotice | Failed or undetermined evaluation | System color with stripes; retry action; never a verdict |
| FinalityBanner | Provisional, finalized, escalated, withdrawn | Accepted is labeled provisional |
| TxLifecycle | Stepper and chip for any write | Section 10 |
| AssessmentPanel | Verdict, decided-by, checks, citations, notes | Informational fields labeled |
| EvidenceList | Evidence by self-declared side | Safe links, counters |
| ChallengePanel | Challenge dialog and history | Window and rounds shown |
| RoleGate | Disabled-with-reason wrapper | Explains which role is needed |
| AddressChip | Short address, copy, role labels | Monospace only here |
| ExplorerLink | Link to a tx or contract on the explorer | Only when a real hash or address exists |
| TrustStatement | The honest trust statement | Visible on Overview and How it works |
| ErrorNotice, EmptyState | Guidance | One action each |

### 9.1 ProcessRail variants and rules
- Time layout: nodes are ordered by time and spaced by rank with a readable minimum gap; a
  time axis label shows real elapsed durations between neighbors (do not draw misleading
  proportions). Long gaps get a break mark and the exact duration.
- Event node: type, actor (short), time, source icon. Unsourced events use a dashed ring and
  the word "unsourced".
- MIN_ELAPSED overlay: a bracket from the latest "from" node to the "to" node showing
  "elapsed 6h" next to "required 24h" and a status icon. A missing endpoint draws a ghost node
  labeled "missing: <event type>".
- REQUIRED_EVENT overlay: a marker on the rail; if absent, a ghost node at the expected end.
- MIN_COUNT overlay: a counter badge "3 of 5 recorded" attached to the event type.
- REQUIRED_ROLE overlay: a marker on events by the required role address; "role unset" if the
  pinned role address is the zero address.
- Overlays use the deterministic results from the latest assessment when available; before an
  assessment they are drawn neutral as "rule preview" and labeled so.
- Mobile: the rail becomes vertical with the same overlays stacked beside nodes.
- Text alternative: a table listing events and each check with its result; it is the primary
  accessible representation.

---

## 10. TRANSACTION LIFECYCLE (THE SUBMISSION BAR)

Every write goes through one watcher so the whole app behaves the same.

### 10.1 Stages (a real sequence)
1. Prepare: client-side validation passes; the form shows what will be sent.
2. Sign: the wallet prompt is open.
3. Submitted: a hash exists; show it with a copy chip and an explorer link.
4. Consensus in progress: validators are working. Map the pending, proposing, committing,
   and revealing statuses your installed `TransactionStatus` exposes into one plain-language
   stage with sub-detail (verify the enum; do not assume names).
5. Accepted: validators agreed. Say: "Accepted. This can still be appealed."
6. Finalized: permanent. Say it only for finalized status.
Failure branches (each with its own copy and an action)
- Wallet rejected: nothing was sent; "Try again".
- Submit failed: the transaction was not sent; show the reason.
- Reverted with a contract error: show the mapped message (section 12); no state changed.
- Consensus failure states (for example undetermined or canceled; verify the enum): "Validators
  could not reach agreement. Nothing changed. You can try again."

### 10.2 Behavior
- The stepper and a chip both show the stage; the chip stays visible in a persistent tray so
  navigating away does not lose it.
- Waiting uses the verified `waitForTransactionReceipt` with the target status, retries, and
  interval; stop polling on a terminal state or when the tray item is dismissed.
- After accepted, refetch the affected reads. After finalized, refetch again and update
  finality labels.
- For long evaluations show elapsed time and the sentence: "Validators fetch the evidence and
  compare their results. This can take a while."
- Reads after a write can use the verified `stateStatus` option to show accepted state
  (labeled "provisional") versus finalized state. Verify the accepted values before use.
- Never auto-resubmit a failed write. Retrying is an explicit user action.
- Announce stage changes in an `aria-live="polite"` region.

### 10.3 Evaluation specifics
- Evaluating can legitimately end with INCONCLUSIVE (a verdict) or with no assessment (a
  failed attempt). The UI distinguishes them: INCONCLUSIVE appears in the assessment panel;
  a failed attempt appears as an EvaluationFailureNotice with retry.
- If a dispute stays CHALLENGED, the actions bar shows "Request re-evaluation".

---

## 11. READS VERSUS WRITES

| | Read (view call) | Write (transaction) |
|---|---|---|
| Latency | Fast, no consensus | Goes through consensus; can take a while |
| UI | Skeleton, then data, or ErrorNotice | TxLifecycle chip and stepper |
| Retry | Safe, automatic or one click | Explicit only |
| Caching | Cache per entity; refetch after related writes reach accepted and finalized | No optimistic updates |
| Wallet | Not needed | Required |

Wrong network and missing account: block writes, explain the fix, keep reads working.

---

## 12. ERRORS AND EMPTY STATES

Messages explain what happened and what to do. They never blame the participant for a system
failure. The contract's error strings are matched by prefix and phrase; unknown strings fall
back to a generic message with the raw reason in a disclosure.

| Contract message | UI message |
|---|---|
| EXPECTED: caller is not authorized | "This account doesn't have the role needed for this action." |
| EXPECTED: invalid state transition | "This action isn't available at the dispute's current stage." |
| EXPECTED: challenge window closed | "The challenge window has closed for this assessment." |
| EXPECTED: challenge window still open | "The challenge window is still open. Finalizing opens when it closes." |
| EXPECTED: maximum challenge rounds reached | "No more challenge rounds are available for this dispute." |
| EXPECTED: evidence cap reached | "This dispute has reached its evidence limit." |
| EXPECTED: dispute already exists | "That dispute id is taken. A new one was generated; try again." |
| EXPECTED: rule is deprecated | "That rule version is deprecated. Choose the current version." |
| EXPECTED: category requires escalation to the DAO procedure | "This category goes to the DAO's own procedure. Use Escalate." |
| EXPECTED: caller recorded the disputed events | "Strict separation is on: the recorder of these events can't take part in the dispute." |
| EXTERNAL: ... | "A source couldn't be reached. This isn't a finding about the claim. Try again later." |
| TRANSIENT: ... | "The network timed out. Try again." |
| LLM_ERROR: model tried to override a failed deterministic check | "Validators couldn't produce a valid answer. Nothing changed. Request the assessment again." |
| LLM_ERROR: decisive verdict must cite evidence / cites no readable evidence | "The evidence couldn't support a decisive answer. Nothing changed. Add readable evidence or try again." |
| Other LLM_ERROR | "Validators couldn't produce a usable answer. Nothing changed. Request the assessment again." |
| Unknown | "Something unexpected happened. Details are below." |

Empty states (each has exactly one action)
- No rules: "No rules yet. Register the first rule to begin." (registrar)
- No proposals: "No proposals yet. Register a proposal to record its process." (recorder)
- No events: "No process events recorded yet."
- No evidence: "No evidence yet. Add a link, a statement, or an event reference."
- No assessment: "No assessment yet. Request one to have the rule checked."
- No disputes: "No disputes yet. Open one from a proposal."

---

## 13. COPY DECK

Voice: plain verbs, sentence case, active voice. The same action keeps the same name in the
button, the tx chip, and the success message.

### 13.1 Actions
| Contract action | Button | Success message |
|---|---|---|
| register_rule | Register rule | Rule registered |
| register_proposal | Register proposal | Proposal registered |
| record_process_event | Record event | Event recorded |
| open_dispute | Open dispute | Dispute opened |
| submit_evidence | Submit evidence | Evidence submitted |
| evaluate_dispute | Request assessment | Assessment requested |
| challenge_assessment | Challenge this assessment | Challenge submitted |
| re_evaluate | Request re-evaluation | Re-evaluation requested |
| finalize_dispute | Finalize dispute | Dispute finalized |
| escalate_dispute | Escalate to the DAO process | Dispute escalated |
| withdraw_dispute | Withdraw dispute | Dispute withdrawn |

### 13.2 Verdict statements
| Verdict | Statement |
|---|---|
| COMPLIANT | "Compliant. The recorded process and evidence satisfy this rule version." |
| VIOLATION | "Violation. The recorded process or evidence does not satisfy this rule version." |
| INCONCLUSIVE | "Inconclusive. The evidence isn't enough to decide. This is a finding about the evidence, not a failure." |
| (failed attempt) | "Evaluation failed. The check didn't complete and nothing changed." |

### 13.3 Decided-by and finality lines
- Rule check: "Decided by code. A configured check failed or the rule is fully checkable by code."
- Validator consensus: "Code checks found no failure, so validators read the evidence and agreed."
- Provisional: "Assessed. This can still be challenged until <time>."
- Finalized: "Finalized. This is the contract's advisory record. It does not penalize anyone."
- Escalated: "Escalated. The DAO's own procedure takes over from here."
- Withdrawn: "Withdrawn by the disputant. The record stays public."

### 13.4 Standing lines
- Advisory: "Advisory assessment against rule version <n>. It does not penalize anyone."
- Frozen: "Rules are versioned. Disputes use the version active when they opened."
- Trust: "Events are recorded by an authorized recorder and link to their public source.
  Validators read evidence URLs live. The contract doesn't independently prove that a
  recorded event happened."
- Self-declared: "Evidence sides are chosen by the submitter."
- Informational: "Shown for transparency. Validators don't compare this field."

---

## 14. ACCESSIBILITY, RESPONSIVE, MOTION

Accessibility floor
- Semantic landmarks, one h1 per screen, ordered headings; skip link; visible focus ring.
- Dialogs and sheets trap focus, close on Escape, restore focus to the trigger.
- Status never relies on color alone; hatch patterns and icons carry meaning in grayscale.
- The process rail has a table alternative; overlays have accessible names such as
  "Review period check: failed, elapsed 6 hours, required 24 hours".
- Live regions for tx stage changes, copy confirmations, and new assessment rounds.
- Forms: labels, helper text and errors linked with `aria-describedby`; counters announced
  politely at limits.
- Contrast: 4.5:1 text, 3:1 graphical marks and focus indicators, in both themes.

Responsive
- Mobile first; single column below 720px; sheets become full-height.
- The rail turns vertical; tables become stacked entries; no horizontal page scroll.
- Long ids, hashes, and URLs wrap or truncate with a copy chip. Touch targets at least 44px.

Motion
- The only non-user-triggered motion: on first view of a dispute the rail overlays draw in
  once over about 500ms. Reduced motion shows the final state immediately.
- Action-driven motion allowed: sheet and dialog open and close, tx stepper advance, a single
  highlight on a newly created row.

---

## 15. MOCK MODE AND FIXTURES

A mock chain client implements the same app-level functions (section 7) so every screen and
lifecycle state can be built and tested without a network. Enable with an environment flag; show
a visible "Mock data" tag; never ship it enabled in a deployed build.

Required fixtures
| Fixture | Shows |
|---|---|
| deterministic-violation | Review period too short; code-decided; no consensus |
| interpretive-compliant | Consensus verdict with cited readable evidence |
| interpretive-inconclusive | Unreadable evidence; inconclusive |
| evaluation-failed | No assessment; failed attempt notice with retry |
| challenged-awaiting | CHALLENGED, waiting for re-evaluation |
| reassessed | Two rounds with history |
| finalized | Final record, no actions |
| vote-required-escalated | Category requiring a vote; escalation |
| withdrawn | Withdrawn record |
| unsourced-events | Events without source links |
| max-rounds | No challenge rounds left |
| role-views | Owner, recorder, registrar, escalator, anonymous |

Mock transactions step through every lifecycle stage and each failure branch on demand.

---

## 16. TEST PLAN

Component and screen tests (mock client)
- [ ] ProcessRail: events, each overlay kind pass and fail, ghost nodes, unsourced events, text alternative
- [ ] VerdictBadge and DecidedByBadge distinct; EvaluationFailureNotice never uses verdict styling
- [ ] Dispute detail renders every status with the correct actions and disabled reasons
- [ ] Open dispute: validation, id generation, "already exists" handling
- [ ] Challenge dialog: reason required, evidence rows, rounds and window shown
- [ ] Register rule: checks builder per kind, deterministic rule needs a check, existing id warning
- [ ] Record event: chronological enforcement, time conversion to UNIX seconds
- [ ] Role gating shows reasons for each role
- [ ] TxLifecycle: every stage and failure branch; accepted never shows final wording
- [ ] Error map for every row in section 12 plus the unknown fallback
- [ ] Unknown enum values render neutral without crashing
- [ ] Reads decoding normalizer handles both plain objects and Maps

Accessibility
- [ ] axe checks on each screen state with no serious violations
- [ ] keyboard-only run through every flow
- [ ] reduced motion removes the rail animation; grayscale remains readable

End to end (Playwright)
- [ ] against mock mode: every fixture flow
- [ ] against StudioNet: the demo script from AGENTS.md section 19
- [ ] dead evidence link path ends in an inconclusive verdict or a clear failure notice
- [ ] wrong network and missing wallet paths

Build gates
```
npm run typecheck && npm run lint && npm run test && npm run build
```
The UI is not done until these pass and each screen has been exercised against the deployed
contract.

---

## 17. DEMO AND EVIDENCE CAPTURE

Capture, with real data only
- Screenshots: Overview, a rule with checks, a proposal with the process rail, a dispute with
  a code-decided violation, a dispute with a validator-consensus verdict, a challenge round,
  a failed evaluation notice, the transaction tray at accepted and at finalized
- A screen recording of the guided demo (AGENTS.md section 19)
- The live frontend URL, contract address, and explorer links for key transactions
- Test and build output, accessibility results
- A README section "Using the app" mirroring the demo steps

---

## 18. ANTI-PATTERNS

NEVER:
1. Recompute or override a verdict, or show a failed evaluation as a verdict.
2. Treat INCONCLUSIVE as a failure, or a failure as INCONCLUSIVE.
3. Show accepted as final, or use the padlock or "final" wording before finalization.
4. Use optimistic updates or auto-retry writes.
5. Present self-declared evidence sides, recorder-asserted events, the validator note, or the
   fetch fingerprint as verified facts.
6. Hide actions the user can't take instead of explaining why.
7. Convey status by color alone.
8. Call genlayer-js from components, or guess client method names or argument encodings.
9. Put keys, tokens, or private data in the frontend, logs, or screenshots.
10. Insert chain data as HTML, or open links without `rel="noopener noreferrer"`.
11. Add screens or features that imply penalties, scores, or enforcement.
12. Reintroduce the rejected defaults in section 3.7.
13. Ship mock mode enabled in a deployed build.

---

## 19. UI MILESTONES AND FINAL CHECKLIST

| # | Milestone | Evidence |
|---|---|---|
| U1 | Tokens, fonts, shell, routing, network and account chips, mock client and fixtures | screenshots, build output |
| U2 | TxLifecycle watcher and tray with every stage and failure branch, tested in mock mode | test output |
| U3 | ProcessRail with all overlay kinds and the text alternative, tested | test output, screenshots |
| U4 | Chain layer bound to verified genlayer-js calls; schema saved; reads normalized | schema file, api-ledger |
| U5 | Rules and Proposals screens against StudioNet | recording, tx links |
| U6 | Disputes list and detail against StudioNet, including evaluation and failure states | recording, tx links |
| U7 | Challenge, re-evaluation, finalize, escalate, withdraw flows | recording, tx links |
| U8 | Admin and How it works; roles and policy flows | screenshots |
| U9 | Accessibility, responsive, reduced-motion passes; Playwright suite green | axe and test output |
| U10 | Deployed on the public testnet and hosted; demo recording | live URL, recording |

Final checklist
- [ ] Every contract write is reachable from the UI and shows the full lifecycle, including failure
- [ ] Code-decided and consensus-decided assessments look and read differently
- [ ] Failed evaluations, inconclusive verdicts, and violations are three distinct things
- [ ] Accepted is provisional everywhere; finalized and escalated are labeled correctly
- [ ] Trust statement, self-declared labels, and informational labels are present
- [ ] All genlayer-js calls verified and recorded in the API ledger; schema saved; all chain access in `lib/chain`
- [ ] Typed config; no secrets; mock mode off in production
- [ ] Accessibility, responsive, and reduced-motion checks pass
- [ ] Typecheck, lint, tests, build, and Playwright pass; exercised against the deployed contract
- [ ] Screenshots, recording, live URL, and explorer links collected from real runs

---

End of UI.md. When in doubt: show the process, show who decided, show how final it is, and never blame a person for a system failure.
