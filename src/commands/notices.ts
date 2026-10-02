import { InvalidArgumentError, type Command } from "commander";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PortalClient } from "../portal.js";
import { parsePositiveInt } from "../validate.js";
import type { MessageKind } from "../types.js";

const KINDS: MessageKind[] = ["messages", "univ", "job"];

function parseKind(value: string): MessageKind {
  if ((KINDS as string[]).includes(value)) return value as MessageKind;
  throw new InvalidArgumentError(`"${value}" は ${KINDS.join(" / ")} のいずれかで指定してください。`);
}

const TYPE_HELP = "messages=メッセージ受信一覧, univ=大学からのお知らせ, job=就職のお知らせ";

export function registerNotices(program: Command): void {
  program
    .command("notices")
    .description("お知らせ・メッセージの一覧を取得 (要ログイン)")
    .option("--type <type>", TYPE_HELP, parseKind, "messages")
    .option("--limit <n>", "取得件数 (最大100)", parsePositiveInt, 10)
    .option("--page <n>", "ページ番号 (1ページ = limit 以上の 5/10/20/50/100 件)", parsePositiveInt)
    .option("--unread", "未読のみ表示")
    .action(async (opts) => {
      const client = await PortalClient.open();
      const result = await client.messages(opts.type, { limit: Math.min(opts.limit, 100), page: opts.page });
      const items = opts.unread ? result.items.filter((i) => i.unread) : result.items;
      console.log(JSON.stringify({ ...result, count: items.length, items }, null, 2));
    });

  program
    .command("notice")
    .description("お知らせ・メッセージの本文を取得 (要ログイン。開いたメッセージはポータル上で既読になります)")
    .requiredOption("--id <id>", "notices で得たメッセージ ID")
    .option("--type <type>", TYPE_HELP, parseKind, "messages")
    .option("--download [dir]", "添付ファイルを保存 (省略時は一時ディレクトリ)。出力の attachments[].path に保存先")
    .action(async (opts) => {
      const client = await PortalClient.open();
      const downloadDir = opts.download
        ? opts.download === true
          ? join(tmpdir(), "campusmate-cli", opts.id)
          : resolve(opts.download)
        : undefined;
      console.log(JSON.stringify(await client.message(opts.type, opts.id, { downloadDir }), null, 2));
    });
}
