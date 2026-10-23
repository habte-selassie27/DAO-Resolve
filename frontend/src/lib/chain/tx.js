import { reactive } from "vue";
import { TransactionStatus, ExecutionResult } from "genlayer-js/types";
import { mockMode } from "../../config/contracts.js";
import { clearReadCache } from "./reads.js";
import { readClient } from "./clients.js";
import * as mock from "../mock/client.js";
import { explainError } from "../errors.js";

export const txState = reactive({
  items: [],
});

let counter = 0;

function patch(id, values) {
  const item = txState.items.find((entry) => entry.id === id);
  if (item) Object.assign(item, values);
}

export function dismissTx(id) {
  const index = txState.items.findIndex((entry) => entry.id === id);
  if (index >= 0) txState.items.splice(index, 1);
}

const CONSENSUS = new Set([
  TransactionStatus.PENDING,
  TransactionStatus.PROPOSING,
  TransactionStatus.COMMITTING,
  TransactionStatus.REVEALING,
  TransactionStatus.APPEAL_REVEALING,
  TransactionStatus.APPEAL_COMMITTING,
]);

const FAILED = new Set([
  TransactionStatus.UNDETERMINED,
  TransactionStatus.CANCELED,
  TransactionStatus.VALIDATORS_TIMEOUT,
  TransactionStatus.LEADER_TIMEOUT,
]);

function statusOf(receipt) {
  return receipt?.statusName || receipt?.status;
}

function contractError(receipt) {
  const leaders = receipt?.consensus_data?.leader_receipt || [];
  for (const leader of leaders) {
    if (leader?.error) return leader.error;
  }
  return "";
}

export async function runTransaction({
  label,
  send,
  onAccepted,
  onFinalized,
  interval = 4000,
  retries = 120,
}) {
  const id = `tx-${++counter}`;
  txState.items.unshift({
    id,
    label,
    stage: "preparing",
    hash: "",
    error: "",
    errorDetail: "",
    createdAt: Date.now(),
  });

  let hash = "";
  try {
    patch(id, { stage: "signing" });
    hash = await send();
    patch(id, { stage: "submitted", hash });
  } catch (error) {
    const message = error?.message || String(error);
    const rejected = /reject|denied|cancel/i.test(message);
    patch(id, {
      stage: rejected ? "rejected" : "failed",
      error: rejected
        ? "The wallet rejected the request. Nothing was sent."
        : "The transaction could not be sent.",
      errorDetail: message,
    });
    return { ok: false, hash: "", error: message };
  }

  let accepted = false;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, interval));
    let receipt;
    try {
      receipt = mockMode ? await mock.getTransaction({ hash }) : await readClient.getTransaction({ hash });
    } catch (error) {
      patch(id, { errorDetail: error?.message || String(error) });
      continue;
    }
    const status = statusOf(receipt);
    if (status === TransactionStatus.ACCEPTED || status === TransactionStatus.READY_TO_FINALIZE) {
      if (!accepted) {
        accepted = true;
        patch(id, { stage: "accepted", detail: "" });
        if (onAccepted) onAccepted(receipt);
      }
      continue;
    }
    if (status === TransactionStatus.FINALIZED) {
      const failure = contractError(receipt);
      if (failure || receipt.txExecutionResultName === ExecutionResult.FINISHED_WITH_ERROR) {
        const explained = explainError(failure);
        patch(id, {
          stage: "reverted",
          detail: "",
          error: explained.message,
          errorDetail: failure || "The contract rejected the transaction.",
        });
        return { ok: false, hash, error: failure };
      }
      patch(id, { stage: "finalized", detail: "" });
      clearReadCache();
      if (onFinalized) onFinalized(receipt);
      return { ok: true, hash, receipt };
    }
    if (FAILED.has(status)) {
      patch(id, {
        stage: "failed",
        detail: "",
        error: "Validators could not reach agreement. Nothing changed. You can try again.",
        errorDetail: `Status: ${status}`,
      });
      return { ok: false, hash, error: status };
    }
    if (CONSENSUS.has(status)) {
      patch(id, { stage: "consensus", detail: String(status) });
    }
  }

  if (accepted) {
    patch(id, {
      stage: "accepted",
      detail: "Accepted. Finality is still pending; refresh later to confirm.",
    });
  } else {
    patch(id, {
      stage: "failed",
      error: "The transaction is taking longer than expected. It may still finalize.",
      errorDetail: "Polling limit reached.",
    });
  }
  return { ok: accepted, hash };
}

export const stageLabels = {
  preparing: "Preparing",
  signing: "Waiting for wallet",
  submitted: "Submitted",
  consensus: "Consensus in progress",
  accepted: "Accepted (provisional)",
  finalized: "Finalized",
  rejected: "Wallet rejected",
  reverted: "Rejected by the contract",
  failed: "Evaluation failed",
};