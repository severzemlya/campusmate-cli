import type { Command } from "commander";
import { PortalClient } from "../portal.js";
import { HttpSession } from "../session.js";
import {
  loadConfig,
  saveConfig,
  resolveCredentials,
  promptCredentials,
  isSecretReference,
} from "../auth.js";

export function registerLogin(program: Command): void {
  program
    .command("login")
    .description("九大 SSO でログインしてセッションを保存 (認証情報は環境変数 → 設定ファイル → 端末入力の順に使用)")
    .option("--op <item>", "1Password の項目参照 (例: op://Personal/<item>)。username / password 欄を使い、設定ファイルに参照だけを保存")
    .action(async (opts) => {
      if (opts.op) {
        if (!isSecretReference(opts.op)) throw new Error("--op には op:// で始まる参照を指定してください");
        const ref = opts.op.replace(/\/+$/, "");
        await saveConfig({ username: `${ref}/username`, password: `${ref}/password` });
      }
      const client = new PortalClient(
        await HttpSession.load(),
        async () => (await resolveCredentials()) ?? (await promptCredentials()),
      );
      await client.login();
      console.log(JSON.stringify({ loggedIn: true }, null, 2));
    });

  program
    .command("logout")
    .description("ログアウトして保存済みセッションを削除")
    .option("--forget", "設定ファイルの 1Password 参照も削除")
    .action(async (opts) => {
      const client = await PortalClient.open();
      await client.logout();
      if (opts.forget) await saveConfig({});
      console.log(JSON.stringify({ loggedIn: false }, null, 2));
    });

  program
    .command("status")
    .description("ログイン状態と認証情報の設定状況を表示")
    .action(async () => {
      const client = await PortalClient.open();
      const config = await loadConfig();
      const sessionValid = await client.isSessionValid();
      console.log(
        JSON.stringify(
          {
            sessionValid,
            credentials:
              process.env.CAMPUSMATE_USERNAME && process.env.CAMPUSMATE_PASSWORD
                ? "env"
                : config.username && config.password
                  ? "config"
                  : "none",
          },
          null,
          2,
        ),
      );
    });
}
