# home-assistant-agent-mcp

A small [MCP](https://modelcontextprotocol.io) server that lets an AI agent read and manage your [Home Assistant](https://www.home-assistant.io): check states, control devices, write automations, build dashboards and tidy up names and rooms, all in plain language.

It is around 600 lines of TypeScript, built on the official [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk). It is meant to be easy to read, fork and change for your own home.

> Looking for a no-code option? Home Assistant also has a built-in [MCP Server integration](https://www.home-assistant.io/integrations/mcp_server/). This project goes further with configuration tasks such as automations, dashboards and the entity, device and area registries.

## What you can ask

- "Which lights are still on?"
- "Show me the bedroom temperature over the last 24 hours."
- "Create an automation that turns off the hallway light at midnight."
- "Rename these sensors so they make sense and put them in the right rooms."

## Tools

| Tool | What it does |
|---|---|
| `ha_get_states` | List entity states, optionally filtered by domain |
| `ha_get_entity` | State and attributes of one entity |
| `ha_get_history` | State history of an entity over the last N hours |
| `ha_render_template` | Render a Jinja2 template (handy for testing) |
| `ha_call_service` | Call any service, e.g. `light.turn_on`, `climate.set_temperature` |
| `ha_notify` | Send a notification through a notifier |
| `ha_list_automations` | List automations with id, alias and state |
| `ha_get_automation` | Full config of one automation |
| `ha_create_automation` | Create an automation |
| `ha_update_automation` | Update an automation |
| `ha_delete_automation` | Permanently delete an automation |
| `ha_toggle_automation` | Enable or disable an automation |
| `ha_list_dashboards` | List Lovelace dashboards |
| `ha_get_dashboard` | Full config of a dashboard |
| `ha_create_dashboard` | Create a dashboard |
| `ha_update_dashboard` | Save a dashboard's views and cards |
| `ha_rename_entity` | Rename an entity (or clear its name) |
| `ha_update_device` | Rename a device and/or move it to an area |
| `ha_list_areas` | List areas (rooms) and floors |
| `ha_update_area` | Rename an area and/or assign it to a floor |

It uses Home Assistant's **REST API** for states, services and history, and the **WebSocket API** for configuration such as registries and dashboards.

## Requirements

- Node.js 20 or newer
- A Home Assistant instance you can reach from your machine
- A Home Assistant **long-lived access token**: in Home Assistant, open your profile → *Security* → *Long-lived access tokens* → *Create token*
- An MCP client, for example [Claude Code](https://docs.claude.com/en/docs/claude-code), Claude Desktop, or any other MCP-capable agent

## Setup

```bash
git clone https://github.com/<your-user>/home-assistant-agent-mcp.git
cd home-assistant-agent-mcp
npm install
npm run build
cp .env.example .env   # then set HA_URL and HA_TOKEN
```

The server reads two environment variables:

| Variable | Example | Required |
|---|---|---|
| `HA_URL` | `http://homeassistant.local:8123` | No (this is the default) |
| `HA_TOKEN` | your long-lived access token | Yes |

### Connect it to Claude Code

The included scripts register the server for a limited time and remove it again automatically:

```bash
./ha-on.sh      # enable for 4 hours (default)
./ha-on.sh 1    # enable for 1 hour
./ha-off.sh     # disable now
```

Or register it yourself:

```bash
claude mcp add home-assistant -s user \
  -e HA_URL=http://homeassistant.local:8123 \
  -e HA_TOKEN=your-token \
  -- node /path/to/home-assistant-agent-mcp/dist/index.js
```

### Other MCP clients

Any client that can start a local (stdio) MCP server works. Point it at `node dist/index.js` and pass `HA_URL` and `HA_TOKEN` as environment variables.

### Test without an agent

```bash
npx @modelcontextprotocol/inspector -e HA_TOKEN=your-token node dist/index.js
```

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) lets you call each tool by hand.

## Security

This server gives an agent real control over your home, so please be careful:

- **Treat the token like a password.** Keep it in `.env` (which is git-ignored) and never paste it into a chat. Note that `claude mcp add -e HA_TOKEN=…` stores it in plain text in your local Claude config.
- **Prefer a dedicated Home Assistant user** for the agent, so you can see what it does and revoke its token at any time.
- **Keep it off when you don't need it.** `ha-on.sh` turns the server off again after a few hours.
- **Review changes before they run.** Keep your client's tool-approval prompts on, especially for `ha_call_service`, `ha_delete_automation` and `ha_update_dashboard`.
- **Keep Home Assistant off the public internet**, or put it behind proper authentication and TLS.

## Make it your own

All tools are defined in [`src/index.ts`](src/index.ts): one list of tool definitions and one `dispatch` function. To add a tool, add a definition with a clear description and handle it in `dispatch`. Clear descriptions matter a lot: they are what the agent reads to choose the right tool.

```bash
npm run dev     # run from source with tsx
npm run build   # compile to dist/
```

## License

[MIT](LICENSE). Use it, change it, share it.

Not affiliated with or endorsed by Home Assistant or the Open Home Foundation.
