import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { HAClient } from "./ha-client.js";
import { HAWebSocket } from "./ha-websocket.js";

const HA_URL = process.env.HA_URL ?? "http://homeassistant.local:8123";
const HA_TOKEN = process.env.HA_TOKEN ?? "";

if (!HA_TOKEN) {
  process.stderr.write("Error: HA_TOKEN environment variable is required\n");
  process.exit(1);
}

const ha = new HAClient(HA_URL, HA_TOKEN);
const ws = new HAWebSocket(HA_URL, HA_TOKEN);

const server = new Server(
  { name: "home-assistant-agent-mcp", version: "1.2.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // ── States & Entities ──────────────────────────────────────────
    {
      name: "ha_get_states",
      description: "Get all entity states. Optionally filter by domain (e.g. light, climate, sensor, switch).",
      inputSchema: {
        type: "object",
        properties: {
          domain: { type: "string", description: "Filter by domain (optional)" },
        },
      },
    },
    {
      name: "ha_get_entity",
      description: "Get state and all attributes of a specific entity.",
      inputSchema: {
        type: "object",
        properties: {
          entity_id: { type: "string" },
        },
        required: ["entity_id"],
      },
    },
    {
      name: "ha_rename_entity",
      description:
        "Set or clear an entity's own name in the entity registry. Note: for device-based entities the displayed name is usually " +
        "'<device name> <entity name>', so to rename a room's thermostat, rename the device (ha_update_device) or the area " +
        "(ha_update_area) instead, and clear the entity name. Pass null, \"\" or \"null\" to clear the name.",
      inputSchema: {
        type: "object",
        properties: {
          entity_id: { type: "string", description: "e.g. sensor.office_room_thermostat_office_temperature" },
          name: {
            type: ["string", "null"],
            description: "New entity name, e.g. 'Temperature'. null, \"\" or \"null\" clears it (falls back to the device name).",
          },
        },
        required: ["entity_id", "name"],
      },
    },
    {
      name: "ha_update_device",
      description:
        "Rename a device and/or move it to another area. Identify it by device_id or by one of its entity_ids. " +
        "Moving a device moves all its entities that don't have an area of their own.",
      inputSchema: {
        type: "object",
        properties: {
          device_id: { type: "string", description: "Device registry id (optional if entity_id is given)" },
          entity_id: { type: "string", description: "Any entity of the device, e.g. climate.bedroom_room_climate_control" },
          name: {
            type: ["string", "null"],
            description: "New device name (name_by_user). null, \"\" or \"null\" restores the integration's name. Omit to keep.",
          },
          area_id: {
            type: ["string", "null"],
            description: "Area id from ha_list_areas. null removes the area. Omit to keep.",
          },
        },
      },
    },
    {
      name: "ha_list_areas",
      description: "List all areas (rooms) with their ids, names and floors, plus the list of floors.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "ha_update_area",
      description: "Rename an area (room) and/or assign it to a floor. The area_id stays the same, so automations keep working.",
      inputSchema: {
        type: "object",
        properties: {
          area_id: { type: "string", description: "Area id from ha_list_areas, e.g. bedroom" },
          name: { type: "string", description: "New area name. Omit to keep." },
          floor_id: {
            type: ["string", "null"],
            description: "Floor id from ha_list_areas, e.g. ground. null removes the floor. Omit to keep.",
          },
        },
        required: ["area_id"],
      },
    },
    // ── Control ────────────────────────────────────────────────────
    {
      name: "ha_call_service",
      description: "Call any Home Assistant service to control lights, climate, media players, switches, etc.",
      inputSchema: {
        type: "object",
        properties: {
          domain: { type: "string", description: "e.g. light, climate, switch, automation" },
          service: { type: "string", description: "e.g. turn_on, set_temperature" },
          data: { type: "object", description: "Service payload (entity_id, temperature, etc.)" },
        },
        required: ["domain", "service"],
      },
    },
    // ── Automations ────────────────────────────────────────────────
    {
      name: "ha_list_automations",
      description: "List all automations with their IDs, aliases, and enabled state.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "ha_get_automation",
      description: "Get the full config of a specific automation by its numeric ID.",
      inputSchema: {
        type: "object",
        properties: {
          automation_id: { type: "string", description: "Numeric ID from ha_list_automations" },
        },
        required: ["automation_id"],
      },
    },
    {
      name: "ha_create_automation",
      description: "Create a new automation. Provide the full config object.",
      inputSchema: {
        type: "object",
        properties: {
          config: {
            type: "object",
            description: "Automation config: alias, description, trigger, condition, action, mode",
          },
        },
        required: ["config"],
      },
    },
    {
      name: "ha_update_automation",
      description: "Update an existing automation by its numeric ID.",
      inputSchema: {
        type: "object",
        properties: {
          automation_id: { type: "string" },
          config: { type: "object" },
        },
        required: ["automation_id", "config"],
      },
    },
    {
      name: "ha_delete_automation",
      description: "Permanently delete an automation by its numeric ID.",
      inputSchema: {
        type: "object",
        properties: {
          automation_id: { type: "string" },
        },
        required: ["automation_id"],
      },
    },
    {
      name: "ha_toggle_automation",
      description: "Enable or disable an automation.",
      inputSchema: {
        type: "object",
        properties: {
          entity_id: { type: "string", description: "e.g. automation.heating_season_off" },
          enable: { type: "boolean" },
        },
        required: ["entity_id", "enable"],
      },
    },
    // ── Dashboards ─────────────────────────────────────────────────
    {
      name: "ha_list_dashboards",
      description: "List all Lovelace dashboards.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "ha_get_dashboard",
      description: "Get the full card/view config of a Lovelace dashboard. Omit url_path for the default dashboard.",
      inputSchema: {
        type: "object",
        properties: {
          url_path: { type: "string", description: "Dashboard URL path (omit for default)" },
        },
      },
    },
    {
      name: "ha_create_dashboard",
      description: "Create a new Lovelace dashboard.",
      inputSchema: {
        type: "object",
        properties: {
          url_path: { type: "string", description: "URL slug, e.g. heating" },
          title: { type: "string" },
          icon: { type: "string", description: "MDI icon, e.g. mdi:home" },
          show_in_sidebar: { type: "boolean" },
        },
        required: ["url_path", "title"],
      },
    },
    {
      name: "ha_update_dashboard",
      description: "Save the full config (views, cards) of a Lovelace dashboard. Omit url_path for the default dashboard.",
      inputSchema: {
        type: "object",
        properties: {
          url_path: { type: "string", description: "Dashboard URL path (omit for default)" },
          config: { type: "object", description: "Full Lovelace config with views and cards" },
        },
        required: ["config"],
      },
    },
    // ── Utilities ──────────────────────────────────────────────────
    {
      name: "ha_render_template",
      description: "Render a Jinja2 template string. Useful for testing templates before using them in automations.",
      inputSchema: {
        type: "object",
        properties: {
          template: { type: "string", description: "e.g. {{ states('sensor.outdoor_temperature') }}" },
        },
        required: ["template"],
      },
    },
    {
      name: "ha_notify",
      description: "Send a notification via Home Assistant.",
      inputSchema: {
        type: "object",
        properties: {
          message: { type: "string" },
          title: { type: "string" },
          target: { type: "string", description: "Notifier name, e.g. mobile_app_my_phone" },
        },
        required: ["message"],
      },
    },
    {
      name: "ha_get_history",
      description: "Get the state history of an entity over the last N hours.",
      inputSchema: {
        type: "object",
        properties: {
          entity_id: { type: "string" },
          hours: { type: "number", description: "Hours of history (default 24)" },
        },
        required: ["entity_id"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  try {
    const result = await dispatch(name, args as Record<string, unknown>);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
      isError: true,
    };
  }
});

interface RegistryEntity {
  entity_id: string;
  device_id: string | null;
  area_id: string | null;
}

interface RegistryDevice {
  id: string;
  area_id: string | null;
}

/** Clients often can't send JSON null for a string field, so treat "", "null" and null alike. */
function clearable(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" || s.toLowerCase() === "null" ? null : s;
}

async function getDevice(deviceId: string): Promise<RegistryDevice> {
  const devices = await ws.command<RegistryDevice[]>({ type: "config/device_registry/list" });
  const device = devices.find((d) => d.id === deviceId);
  if (!device) throw new Error(`Device ${deviceId} not found`);
  return device;
}

async function dispatch(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    // ── States & Entities ──────────────────────────────────────────
    case "ha_get_states": {
      const states = await ha.get<Array<{ entity_id: string }>>("/api/states");
      return args.domain
        ? states.filter((s) => s.entity_id.startsWith(`${args.domain}.`))
        : states;
    }

    case "ha_get_entity":
      return ha.get(`/api/states/${args.entity_id}`);

    case "ha_rename_entity": {
      const name = clearable(args.name);
      if (name !== null) {
        return ws.command({ type: "config/entity_registry/update", entity_id: args.entity_id, name });
      }
      // HA refuses to clear the name of an entity that has its own area. If its area matches
      // the device's area, drop the entity's own area (it then inherits the same one).
      const entity = await ws.command<RegistryEntity>({ type: "config/entity_registry/get", entity_id: args.entity_id });
      const update: Record<string, unknown> = { type: "config/entity_registry/update", entity_id: args.entity_id, name: null };
      if (entity.area_id && entity.device_id) {
        const device = await getDevice(entity.device_id);
        if (device.area_id && device.area_id !== entity.area_id) {
          throw new Error(
            `Can't clear the name: ${args.entity_id} has its own area '${entity.area_id}' but its device is in ` +
              `'${device.area_id}'. Move the device first with ha_update_device (area_id: '${entity.area_id}'), then retry.`
          );
        }
        if (!device.area_id) {
          await ws.command({ type: "config/device_registry/update", device_id: device.id, area_id: entity.area_id });
        }
        update.area_id = null;
      }
      return ws.command(update);
    }

    case "ha_update_device": {
      let deviceId = args.device_id as string | undefined;
      if (!deviceId && args.entity_id) {
        const entity = await ws.command<RegistryEntity>({ type: "config/entity_registry/get", entity_id: args.entity_id });
        deviceId = entity.device_id ?? undefined;
        if (!deviceId) throw new Error(`${args.entity_id} doesn't belong to a device`);
      }
      if (!deviceId) throw new Error("Provide device_id or entity_id");
      const update: Record<string, unknown> = { type: "config/device_registry/update", device_id: deviceId };
      if ("name" in args) update.name_by_user = clearable(args.name);
      if ("area_id" in args) update.area_id = clearable(args.area_id);
      return ws.command(update);
    }

    case "ha_list_areas": {
      const [areas, floors] = await Promise.all([
        ws.command<Array<Record<string, unknown>>>({ type: "config/area_registry/list" }),
        ws.command<Array<Record<string, unknown>>>({ type: "config/floor_registry/list" }),
      ]);
      return {
        areas: areas.map((a) => ({ area_id: a.area_id, name: a.name, floor_id: a.floor_id })),
        floors: floors.map((f) => ({ floor_id: f.floor_id, name: f.name, level: f.level })),
      };
    }

    case "ha_update_area": {
      const update: Record<string, unknown> = { type: "config/area_registry/update", area_id: args.area_id };
      if (typeof args.name === "string" && args.name.trim()) update.name = args.name.trim();
      if ("floor_id" in args) update.floor_id = clearable(args.floor_id);
      return ws.command(update);
    }

    // ── Control ────────────────────────────────────────────────────
    case "ha_call_service":
      return ha.post(`/api/services/${args.domain}/${args.service}`, args.data ?? {});

    // ── Automations (REST config API) ──────────────────────────────
    case "ha_list_automations": {
      // HA has no list endpoint; automation entities carry the config id in attributes.id
      const states = await ha.get<Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>>("/api/states");
      return states
        .filter((s) => s.entity_id.startsWith("automation."))
        .map((s) => ({
          id: s.attributes.id,
          entity_id: s.entity_id,
          alias: s.attributes.friendly_name,
          enabled: s.state === "on",
          last_triggered: s.attributes.last_triggered,
        }));
    }

    case "ha_get_automation":
      return ha.get(`/api/config/automation/config/${args.automation_id}`);

    case "ha_create_automation": {
      const id = String(Date.now());
      await ha.post(`/api/config/automation/config/${id}`, args.config);
      return { id };
    }

    case "ha_update_automation":
      return ha.post(`/api/config/automation/config/${args.automation_id}`, args.config);

    case "ha_delete_automation":
      return ha.del(`/api/config/automation/config/${args.automation_id}`);

    case "ha_toggle_automation": {
      const svc = args.enable ? "turn_on" : "turn_off";
      return ha.post(`/api/services/automation/${svc}`, { entity_id: args.entity_id });
    }

    // ── Dashboards (WebSocket) ─────────────────────────────────────
    case "ha_list_dashboards":
      return ws.command({ type: "lovelace/dashboards/list" });

    case "ha_get_dashboard":
      return ws.command({
        type: "lovelace/config",
        url_path: args.url_path ?? null,
        force: false,
      });

    case "ha_create_dashboard":
      return ws.command({
        type: "lovelace/dashboards/create",
        url_path: args.url_path,
        title: args.title,
        icon: args.icon,
        show_in_sidebar: args.show_in_sidebar ?? true,
        require_admin: false,
      });

    case "ha_update_dashboard":
      return ws.command({
        type: "lovelace/config/save",
        url_path: args.url_path ?? null,
        config: args.config,
      });

    // ── Utilities ──────────────────────────────────────────────────
    case "ha_render_template":
      return ha.post("/api/template", { template: args.template });

    case "ha_notify": {
      const notifier = (args.target as string) ?? "notify";
      return ha.post(`/api/services/notify/${notifier}`, {
        message: args.message,
        title: args.title,
      });
    }

    case "ha_get_history": {
      const hours = (args.hours as number) ?? 24;
      const end = new Date();
      const start = new Date(end.getTime() - hours * 3600 * 1000);
      return ha.get(
        `/api/history/period/${start.toISOString()}?filter_entity_id=${args.entity_id}&end_time=${end.toISOString()}`
      );
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

const transport = new StdioServerTransport();
await server.connect(transport);
