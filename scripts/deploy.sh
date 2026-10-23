#!/usr/bin/env bash
set -euo pipefail

NETWORK="${NETWORK:-studionet}"
CONTRACT="${CONTRACT:-contracts/dao_resolve.py}"

if [[ ! -f "$CONTRACT" ]]; then
  echo "Contract file not found: $CONTRACT" >&2
  exit 1
fi

echo "Using GenLayer network: $NETWORK"
genlayer network set "$NETWORK"

echo "Deploying $CONTRACT"
genlayer deploy --contract "$CONTRACT"

cat <<'EOF'

Next steps:
1. Copy the deployed contract address from the output above.
2. Save the schema:
     genlayer schema <address> > deployments/schema.json
3. Record the address in deployments/studionet.md or deployments/testnet.md.
4. Run:
     CONTRACT_ADDRESS=<address> npm run verify
5. Set the same address in frontend/.env as VITE_CONTRACT_ADDRESS.
EOF
