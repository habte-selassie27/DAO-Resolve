import { readFileSync } from "fs";
import path from "path";
import { TransactionHash, TransactionStatus, GenLayerClient } from "genlayer-js/types";

interface DeployResult {
  transactionHash: string;
  contractAddress: string;
}

export default async function main(client: GenLayerClient<any>): Promise<DeployResult> {
  const filePath = path.resolve(process.cwd(), "contracts/dao_resolve.py");

  if (!filePath || !filePath.endsWith(".py")) {
    throw new Error(`Deploy script expected contracts/dao_resolve.py next to the repo root, found ${filePath}`);
  }

  const contractCode = new Uint8Array(readFileSync(filePath));

  await client.initializeConsensusSmartContract();

  const deployTransaction = (await client.deployContract({
    code: contractCode,
    args: [],
  })) as TransactionHash;

  const receipt = await client.waitForTransactionReceipt({
    hash: deployTransaction,
    status: TransactionStatus.ACCEPTED,
    retries: 200,
  });

  const firstLeaderReceipt =
    receipt?.consensus_data?.leader_receipt?.[0];

  if (firstLeaderReceipt?.execution_result !== "SUCCESS") {
    throw new Error(`Deployment did not execute cleanly. Receipt: ${JSON.stringify(receipt)}`);
  }

  const contractAddress = receipt?.data?.contract_address;
  if (!contractAddress) {
    throw new Error(`Deployment finalized, but no contract address was returned. Receipt: ${JSON.stringify(receipt)}`);
  }

  console.log("\nContract deployed successfully.", {
    "Transaction Hash": deployTransaction,
    "Contract Address": contractAddress,
  });

  return { transactionHash: deployTransaction, contractAddress };
}
