#!/bin/bash
HOURS=${1:-4}
DURATION=$((HOURS * 3600))
PID_FILE="/tmp/home-assistant-mcp-timer.pid"
DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -f "$DIR/.env" ]; then
  echo "Missing $DIR/.env — copy .env.example and set HA_URL / HA_TOKEN." >&2
  exit 1
fi
set -a; source "$DIR/.env"; set +a

# Kill any existing auto-off timer
if [ -f "$PID_FILE" ]; then
  kill "$(cat "$PID_FILE")" 2>/dev/null
  rm -f "$PID_FILE"
fi

# Needs Node >= 20 (fetch breaks on 18 with "File is not defined"); prefer newest nvm install
NODE_BIN=$(ls -d "$HOME"/.nvm/versions/node/v*/bin/node 2>/dev/null | sort -V | tail -1)
NODE_BIN=${NODE_BIN:-$(command -v node)}
if [ "$("$NODE_BIN" -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  echo "Node >= 20 required (found $("$NODE_BIN" -v) at $NODE_BIN). Run: nvm install 20" >&2
  exit 1
fi

# Re-register so path/env changes take effect (add fails silently if it already exists)
claude mcp remove home-assistant -s user >/dev/null 2>&1
claude mcp add home-assistant \
  -s user \
  -e "HA_URL=$HA_URL" \
  -e "HA_TOKEN=$HA_TOKEN" \
  -- "$NODE_BIN" "$DIR/dist/index.js" 2>/dev/null

# Background auto-off timer (survives terminal close)
(sleep "$DURATION" && claude mcp remove home-assistant -s user 2>/dev/null) &
disown $!
echo $! > "$PID_FILE"

EXPIRES=$(date -d "+${HOURS} hours" '+%H:%M' 2>/dev/null || date -v "+${HOURS}H" '+%H:%M')
echo "HA MCP enabled for ${HOURS}h — auto-off at ${EXPIRES}."
echo "Run ha-off.sh to disable immediately."
