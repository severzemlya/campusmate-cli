import { InvalidArgumentError, type Command } from "commander";
import { PortalClient } from "../portal.js";

function parseTerm(value: string): 1 | 2 {
  if (value === "1" || value === "前期") return 1;
  if (value === "2" || value === "後期") return 2;
  throw new InvalidArgumentError(`"${value}" は 前期 / 後期 (1 / 2) のいずれかで指定してください。`);
}

export function registerTimetable(program: Command): void {
  program
    .command("timetable")
    .description("My時間割を取得 (要ログイン)")
    .option("--term <term>", "前期 / 後期 (1 / 2)。省略時はポータルの既定 (現在の学期)", parseTerm)
    .action(async (opts) => {
      const client = await PortalClient.open();
      console.log(JSON.stringify(await client.timetable(opts.term), null, 2));
    });
}
