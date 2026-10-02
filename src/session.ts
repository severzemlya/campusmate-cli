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
      responseType: "arraybuffer",
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
    const res = await this.request("GET", url);
    return { url: res.url, status: res.status, html: res.data.toString("utf8") };
  }

  async post(url: string, fields: FormFields): Promise<PageResponse> {
    const res = await this.request("POST", url, encodeForm(fields));
    return { url: res.url, status: res.status, html: res.data.toString("utf8") };
  }

  /** GET a file. The filename comes from Content-Disposition when present. */
  async download(url: string): Promise<FileResponse> {
    const res = await this.request("GET", url);
    return {
      url: res.url,
      status: res.status,
      data: res.data,
      contentType: String(res.headers["content-type"] ?? ""),
      filename: filenameFromDisposition(String(res.headers["content-disposition"] ?? "")),
    };
  }

  private async request(method: "GET" | "POST", url: string, body?: string): Promise<RawResponse> {
    let current = new URL(url, PORTAL_BASE).toString();
    let currentMethod = method;
    let currentBody = body;

    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      const cookie = await this.jar.getCookieString(current);
      const res = await this.http.request<ArrayBuffer>({
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

      return {
        url: current,
        status: res.status,
        headers: res.headers as Record<string, unknown>,
        data: Buffer.from(res.data ?? new ArrayBuffer(0)),
      };
    }
    throw new Error(`Too many redirects: ${url}`);
  }
}

interface RawResponse {
  url: string;
  status: number;
  headers: Record<string, unknown>;
  data: Buffer;
}

export interface FileResponse {
  url: string;
  status: number;
  data: Buffer;
  contentType: string;
  filename: string | null;
}

/**
 * Extract the filename from a Content-Disposition header.
 * Campusmate sends raw UTF-8 bytes in `filename="..."`, which Node exposes
 * as latin1 characters, so they are re-decoded as UTF-8.
 */
export function filenameFromDisposition(header: string): string | null {
  const star = header.match(/filename\*=(?:UTF-8|utf-8)''([^;]+)/);
  if (star) return decodeURIComponent(star[1].trim());
  const plain = header.match(/filename="([^"]*)"/) ?? header.match(/filename=([^;]+)/);
  if (!plain) return null;
  const raw = plain[1].trim();
  // Only re-decode when every char fits in a byte (i.e. it was latin1-decoded)
  if (!/^[\x00-\xff]*$/.test(raw)) return raw;
  const decoded = Buffer.from(raw, "latin1").toString("utf8");
  return decoded.includes("\ufffd") ? raw : decoded;
}
