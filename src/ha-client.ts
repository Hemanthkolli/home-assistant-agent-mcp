export class HAClient {
  private baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly token: string
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`HA ${res.status} ${res.statusText}: ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`HA ${res.status} ${res.statusText}: ${await res.text()}`);
    const text = await res.text();
    // /api/template returns text/plain, not JSON
    if (!res.headers.get("content-type")?.includes("json")) return text as T;
    return (text ? JSON.parse(text) : {}) as T;
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "PUT",
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`HA ${res.status} ${res.statusText}: ${await res.text()}`);
    const text = await res.text();
    return (text ? JSON.parse(text) : {}) as T;
  }

  async del<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`HA ${res.status} ${res.statusText}: ${await res.text()}`);
    const text = await res.text();
    return (text ? JSON.parse(text) : {}) as T;
  }
}
