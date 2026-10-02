import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile, chmod } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { promisify } from "node:util";
import { configDir, type HttpSession, type PageResponse } from "./session.js";
import { isLoggedIn, isPasswordForm, parseForm } from "./portal-parsers.js";

const execFileAsync = promisify(execFile);

/** Entry point of the Shibboleth SSO flow for Campusmate (Japanese UI) */
export const SSO_ENTRY = "https://ku-portal.kyushu-u.ac.jp/eduapi/gknsso/Campusmate_ja";
const MAX_SSO_STEPS = 12;

export interface Credentials {
  username: string;
  password: string;
}

export interface AuthConfig {
  /** SSO-KID, or a 1Password secret reference (op://...) */
  username?: string;
  /** 1Password secret reference (op://...). Plain passwords are not accepted. */
  password?: string;
}

export class LoginRequiredError extends Error {
  constructor(message = "ログインが必要です。`campusmate-cli login` を実行してください。") {
    super(message);
    this.name = "LoginRequiredError";
  }
}

export class AuthFailedError extends Error {
  constructor(message = "ログインに失敗しました。SSO-KID とパスワードを確認してください。") {
    super(message);
    this.name = "AuthFailedError";
  }
}

export function configPath(): string {
  return join(configDir(), "config.json");
}

export async function loadConfig(): Promise<AuthConfig> {
  try {
    return JSON.parse(await readFile(configPath(), "utf8")) as AuthConfig;
  } catch {
    return {};
  }
}

export async function saveConfig(config: AuthConfig): Promise<void> {
  if (config.password && !isSecretReference(config.password)) {
    throw new Error("パスワードは 1Password の参照 (op://...) でのみ保存できます。");
  }
  await mkdir(configDir(), { recursive: true, mode: 0o700 });
  await writeFile(configPath(), JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
  await chmod(configPath(), 0o600);
}

export function isSecretReference(value: string): boolean {
  return value.startsWith("op://");
}

async function resolveValue(value: string): Promise<string> {
  if (!isSecretReference(value)) return value;
  try {
    const { stdout } = await execFileAsync("op", ["read", value]);
    return stdout.trim();
  } catch (err) {
    throw new Error(`1Password から読み取れませんでした (${value}): ${(err as Error).message}`);
  }
}

/**
 * Resolve credentials without user interaction.
 * Order: environment variables → config file. Values may be op:// references.
 */
export async function resolveCredentials(): Promise<Credentials | null> {
  const config = await loadConfig();
  const username = process.env.CAMPUSMATE_USERNAME ?? config.username;
  const password = process.env.CAMPUSMATE_PASSWORD ?? config.password;
  if (!username || !password) return null;
  return {
    username: await resolveValue(username),
    password: await resolveValue(password),
  };
}

/** Ask for credentials on the terminal (password is not echoed) */
export async function promptCredentials(): Promise<Credentials> {
  if (!process.stdin.isTTY) {
    throw new LoginRequiredError(
      "認証情報が見つかりません。CAMPUSMATE_USERNAME / CAMPUSMATE_PASSWORD を設定するか、端末から `campusmate-cli login` を実行してください。",
    );
  }
  const username = await ask("SSO-KID: ", false);
  const password = await ask("パスワード: ", true);
  return { username, password };
}

function ask(question: string, hidden: boolean): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: true });
    if (hidden) {
      // Suppress echo of typed characters while keeping the prompt visible
      const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput;
      (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
        if (s.includes(question)) write.call(rl, s);
      };
    }
    rl.question(question, (answer) => {
      if (hidden) process.stderr.write("\n");
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Run the SSO flow until Campusmate shows a logged-in page.
 *
 * If the IdP session cookie is still valid, the flow completes without
 * credentials. Credentials are only requested when the IdP shows the
 * password form.
 */
export async function ssoLogin(
  session: HttpSession,
  getCredentials: () => Promise<Credentials | null>,
): Promise<PageResponse> {
  let page = await session.get(SSO_ENTRY);
  let submittedPassword = false;

  for (let step = 0; step < MAX_SSO_STEPS; step++) {
    if (isLoggedIn(page.html)) {
      await session.save();
      return page;
    }

    const form = parseForm(page.html);
    if (!form) {
      const title = page.html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim();
      throw new Error(`ログイン途中で想定外のページになりました: ${title ?? page.url}`);
    }

    if (isPasswordForm(page.html)) {
      if (submittedPassword) throw new AuthFailedError();
      const creds = await getCredentials();
      if (!creds) throw new LoginRequiredError();
      form.fields = form.fields.map(([k, v]) => {
        if (k === "j_username") return [k, creds.username];
        if (k === "j_password") return [k, creds.password];
        return [k, v];
      });
      submittedPassword = true;
    }

    page = await session.post(new URL(form.action, page.url).toString(), form.fields);
  }
  throw new Error("ログイン処理が完了しませんでした (SSO の手順が想定より長い)");
}
