import type { Command } from "commander";
import { CampusmateClient } from "../client.js";
import { parsePositiveInt } from "../validate.js";

export function registerSearchInstructor(program: Command): void {
  program
    .command("search-instructor")
    .description("教員名からシラバスを検索")
    .requiredOption("--name <name>", "教員氏名")
    .option("--department <code>", "教員所属コード")
    .option("--year <year>", "年度", parsePositiveInt)
    .option("--limit <limit>", "取得件数", parsePositiveInt, 10)
    .action(async (opts) => {
      const client = new CampusmateClient();
      const result = await client.searchInstructor({
        name: opts.name,
        department: opts.department,
        year: opts.year,
        limit: opts.limit,
      });
      console.log(JSON.stringify(result, null, 2));
    });
}
