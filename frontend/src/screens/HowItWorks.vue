<template>
  <div class="stack">
    <div class="between">
      <div>
        <h1>How a verdict is made</h1>
        <p class="lede">
          DAOResolve is not an oracle and not a voting system. It is a public process for answering
          one narrow question: did this proposal follow this rule version, according to the recorded
          process and the evidence validators could read?
        </p>
      </div>
      <RouterLink class="button secondary" to="/disputes">See it on real records</RouterLink>
    </div>

    <section class="panel">
      <h2>The trust problem</h2>
      <div class="grid two">
        <div>
          <p>
            DAO rules are prose. Disputes about "did the process comply?" are usually settled by
            whoever has the loudest voice, the admin key, or the patience to argue the longest.
          </p>
          <p class="muted">
            A single model answer is not a fix. It can be steered, it cannot be audited, and two
            runs can disagree without anyone knowing why.
          </p>
        </div>
        <div>
          <p>
            DAOResolve makes the reasoning inspectable: the exact rule version, the recorded
            events, the source links, the code checks, the validator decision, and the history of
            challenges.
          </p>
          <p class="muted">
            The output is advisory. It never executes, cancels, or reverses a governance action,
            and it does not penalize anyone.
          </p>
        </div>
      </div>
    </section>

    <section class="panel">
      <h2>Code first, model second</h2>
      <div class="stack">
        <div class="panel flat">
          <div class="row" style="margin-bottom: 4px"><span class="chip compliant">1</span><strong>Deterministic checks decide what code can decide</strong></div>
          <p class="small muted" style="margin: 0">
            Minimum elapsed time, required events, event counts, and required roles are structured
            checks. If a check fails, the contract forces a violation and the model is never called.
            A DETERMINISTIC_ONLY rule never calls the model at all.
          </p>
        </div>
        <div class="panel flat">
          <div class="row" style="margin-bottom: 4px"><span class="chip signal">2</span><strong>Only residual ambiguity reaches consensus</strong></div>
          <p class="small muted" style="margin: 0">
            If the code checks pass and the rule still needs interpretation, validators fetch the
            evidence URLs live and answer from the pinned clause. They compare meaning, not bytes.
          </p>
        </div>
        <div class="panel flat">
          <div class="row" style="margin-bottom: 4px"><span class="chip">3</span><strong>The record says which one decided</strong></div>
          <p class="small muted" style="margin: 0">
            Every assessment carries <code>decided_by</code>: DETERMINISTIC_CHECKS or INTERPRETATION.
            The UI shows it next to the verdict instead of hiding it behind a generic "AI result".
          </p>
        </div>
      </div>
    </section>

    <section class="panel">
      <h2>What validators compare</h2>
      <div class="grid two">
        <ul class="small" style="margin: 0; padding-left: 20px">
          <li>The verdict: COMPLIANT, VIOLATION, or INCONCLUSIVE.</li>
          <li>Confidence bands within one adjacent step.</li>
          <li>No COMPLIANT after a failed deterministic check.</li>
          <li>For a decisive verdict, at least one evidence id that both runs could read and cite.</li>
        </ul>
        <div class="notice system">
          <p class="small" style="margin: 0">
            <strong>Not compared:</strong> the reasoning prose and the leader's web digest. They are
            informational, not proof. A wrong verdict that every validator shares is still possible;
            that limit is stated rather than hidden.
          </p>
        </div>
      </div>
    </section>

    <section class="panel">
      <h2>Lifecycle and finality</h2>
      <div class="process-rail">
        <div class="rail-line" aria-hidden="true" />
        <div class="rail-event">
          <span class="rail-dot" aria-hidden="true" />
          <strong>OPEN</strong>
          <div class="rail-meta">Anyone can open a dispute. The rule version and challenge policy are pinned.</div>
        </div>
        <div class="rail-event">
          <span class="rail-dot" aria-hidden="true" />
          <strong>EVALUATED</strong>
          <div class="rail-meta">Code checks run; consensus runs only if needed. A challenge window opens.</div>
        </div>
        <div class="rail-event">
          <span class="rail-dot" aria-hidden="true" />
          <strong>CHALLENGED → RE_EVALUATED</strong>
          <div class="rail-meta">A challenge inside the window adds a reason and optional evidence. Re-evaluation is permissionless.</div>
        </div>
        <div class="rail-event">
          <span class="rail-dot" aria-hidden="true" />
          <strong>FINALIZED / ESCALATED / WITHDRAWN</strong>
          <div class="rail-meta">Terminal states accept nothing further. The history stays public.</div>
        </div>
      </div>
      <p class="small muted" style="margin: 8px 0 0">
        A vote-required category cannot be finalized. It must be escalated to the DAO's own
        procedure. Escalation records the handoff; it does not decide anything.
      </p>
    </section>

    <section class="panel">
      <h2>What is real and what is trusted</h2>
      <ul class="small" style="margin: 0; padding-left: 20px">
        <li>Evidence URLs are fetched live by validators. Unreadable evidence cannot support a decisive verdict.</li>
        <li>Process events are asserted by an authorized recorder and link to a public source. The contract does not independently prove the event happened.</li>
        <li>Sides are self-declared. The contract records the label; it does not verify identity.</li>
        <li>The <code>web_digest</code> is leader-asserted and not compared. It is labelled informational.</li>
        <li>The output is advisory. It is not a legal ruling and does not execute or reverse anything.</li>
      </ul>
    </section>

    <section class="panel">
      <h2>Contract and network</h2>
      <dl class="kv">
        <dt>Network</dt><dd>{{ activeNetwork.label }}</dd>
        <dt>Contract</dt><dd class="mono wrap">{{ contractAddress || "not configured" }}</dd>
        <dt>Explorer</dt>
        <dd class="wrap">
          <a v-if="contractExplorerUrl" :href="contractExplorerUrl" target="_blank" rel="noopener noreferrer">{{ contractExplorerUrl }}</a>
          <span v-else class="muted">not configured for this network</span>
        </dd>
        <dt>Status</dt><dd>StudioNet is gasless for this demo; Bradbury requires a funded account.</dd>
      </dl>
      <div class="notice system" style="margin-top: 12px">
        <p class="small" style="margin: 0">
          The frontend reads the deployed contract and shows submitted, pending, accepted,
          finalized, and failed states. It never treats accepted as final.
        </p>
      </div>
    </section>

    <TrustStatement />
  </div>
</template>

<script setup>
import TrustStatement from "../components/TrustStatement.vue";
import { activeNetwork } from "../config/networks.js";
import { contractAddress, contractExplorerUrl } from "../config/contracts.js";
</script>
