import type { Command } from "commander";
import { CampusmateClient } from "../client.js";
import { parsePositiveInt } from "../validate.js";

export function registerDetail(program: Command): void {
  program
    .command("detail")
    .description("講義コードからシラバス詳細を取得")
    .requiredOption("--code <code>", "講義コード")
    .option("--year <year>", "年度", parsePositiveInt)
    .action(async (opts) => {
      const client = new CampusmateClient();
      const result = await client.getDetail(opts.code, opts.year);
      console.log(JSON.stringify(result, null, 2));
    });
}
