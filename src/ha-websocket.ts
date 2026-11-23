import WebSocket from "ws";

export class HAWebSocket {
  private msgId = 1;
  private wsUrl: string;

  constructor(baseUrl: string, private readonly token: string) {
    this.wsUrl = baseUrl.replace(/\/$/, "").replace(/^http/, "ws") + "/api/websocket";
  }

  async command<T>(payload: Record<string, unknown>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      const id = this.msgId++;

      const timeout = setTimeout(() => {
        ws.terminate();
        reject(new Error("WebSocket timeout after 10s"));
      }, 10000);

      ws.on("message", (data) => {
        const msg = JSON.parse(data.toString()) as Record<string, unknown>;

        if (msg["type"] === "auth_required") {
          ws.send(JSON.stringify({ type: "auth", access_token: this.token }));
        } else if (msg["type"] === "auth_ok") {
          ws.send(JSON.stringify({ id, ...payload }));
        } else if (msg["type"] === "auth_invalid") {
          clearTimeout(timeout);
          ws.terminate();
          reject(new Error("WebSocket auth failed"));
        } else if (msg["type"] === "result" && msg["id"] === id) {
          clearTimeout(timeout);
          ws.terminate();
          if (msg["success"]) {
            resolve(msg["result"] as T);
          } else {
            const err = msg["error"] as Record<string, unknown> | undefined;
            reject(new Error((err?.["message"] as string) ?? "Command failed"));
          }
        }
      });

      ws.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }
}
