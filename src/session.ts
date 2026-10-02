import axios, { type AxiosInstance } from "axios";
import { CookieJar } from "tough-cookie";
import { mkdir, readFile, rm, writeFile, chmod } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const PORTAL_BASE = "https://ku-portal.kyushu-u.ac.jp/campusweb/";
const MAX_REDIRECTS = 10;
const USER_AGENT = "campusmate-cli/1.0";

export function configDir(): string {
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(base, "campusmate-cli");
}

export function sessionPath(): string {
  return join(configDir(), "session.json");
}

export interface PageResponse {
  url: string;
  status: number;
  html: string;
}

export type FormFields = [string, string][];

// Build form body as raw string to preserve literal parentheses in field names
export function encodeForm(fields: FormFields): string {
  return fields.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
}

/**
 * HTTP session with a persistent cookie jar.
 * Redirects are followed manually so that cookies set on intermediate
 * responses (SSO hops between ku-portal and idp) are captured.
 */
export class HttpSession {
  private http: AxiosInstance;

  constructor(
    public jar: CookieJar = new CookieJar(),
    private path: string = sessionPath(),
  ) {
    this.http = axios.create({
      timeout: 30000,
      maxRedirects: 0,
      responseType: "text",
      validateStatus: () => true,
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Encoding": "identity",
      },
    });
  }

  static async load(path: string = sessionPath()): Promise<HttpSession> {
    try {
      const raw = await readFile(path, "utf8");
      const jar = await CookieJar.deserialize(JSON.parse(raw));
      return new HttpSession(jar, path);
    } catch {
      return new HttpSession(new CookieJar(), path);
    }
  }

  async save(): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const data = JSON.stringify(await this.jar.serialize());
    await writeFile(this.path, data, { mode: 0o600 });
    // writeFile's mode only applies on creation
    await chmod(this.path, 0o600);
  }

  async clear(): Promise<void> {
    this.jar = new CookieJar();
    await rm(this.path, { force: true });
  }

  async get(url: string): Promise<PageResponse> {
    return this.request("GET", url);
  }

  async post(url: string, fields: FormFields): Promise<PageResponse> {
    return this.request("POST", url, encodeForm(fields));
  }

  private async request(method: "GET" | "POST", url: string, body?: string): Promise<PageResponse> {
    let current = new URL(url, PORTAL_BASE).toString();
    let currentMethod = method;
    let currentBody = body;

    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      const cookie = await this.jar.getCookieString(current);
      const res = await this.http.request<string>({
        method: currentMethod,
        url: current,
        data: currentBody,
        headers: {
          ...(cookie ? { Cookie: cookie } : {}),
          ...(currentMethod === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
        },
      });

      const setCookies = res.headers["set-cookie"] ?? [];
      for (const c of setCookies) {
        await this.jar.setCookie(c, current, { ignoreError: true });
      }

      const location = res.headers["location"];
      if (res.status >= 300 && res.status < 400 && location) {
        current = new URL(location, current).toString();
        // 302/303 after POST become GET (browser behaviour)
        if (res.status !== 307 && res.status !== 308) {
          currentMethod = "GET";
          currentBody = undefined;
        }
        continue;
      }

      return { url: current, status: res.status, html: String(res.data ?? "") };
    }
    throw new Error(`Too many redirects: ${url}`);
  }
}
