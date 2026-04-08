import type { Command } from "commander";
import { CampusmateClient } from "../client.js";
import { parsePositiveInt } from "../validate.js";

export function registerSearchFulltext(program: Command): void {
  program
    .command("search-fulltext")
    .description("キーワードでシラバスを全文検索")
    .requiredOption("--keyword <keyword>", "検索キーワード")
    .option("--match <mode>", "マッチモード (all|any)", "all")
    .option("--year <year>", "年度", parsePositiveInt)
    .option("--limit <limit>", "取得件数", parsePositiveInt, 10)
    .action(async (opts) => {
      const client = new CampusmateClient();
      const result = await client.searchFulltext({
        keyword: opts.keyword,
        match: opts.match as "all" | "any",
        year: opts.year,
        limit: opts.limit,
      });
      console.log(JSON.stringify(result, null, 2));
    });
}
