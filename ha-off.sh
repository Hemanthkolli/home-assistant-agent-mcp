#!/bin/bash
PID_FILE="/tmp/home-assistant-mcp-timer.pid"

# Cancel the auto-off timer
if [ -f "$PID_FILE" ]; then
  kill "$(cat "$PID_FILE")" 2>/dev/null
  rm -f "$PID_FILE"
fi

claude mcp remove home-assistant -s user 2>/dev/null
echo "HA MCP disabled."
