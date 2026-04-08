import type { Command } from "commander";
import { CampusmateClient } from "../client.js";

export function registerSearchLecture(program: Command): void {
  program
    .command("search-lecture")
    .description("講義名や担当教員からシラバスを検索")
    .option("--name <name>", "講義名称")
    .option("--instructor <instructor>", "担当教員")
    .option("--faculty <code>", "開講学部・学府コード")
    .option("--semester <semester>", "開講時期")
    .option("--year <year>", "年度", parseInt)
    .option("--limit <limit>", "取得件数", parseInt, 10)
    .action(async (opts) => {
      const client = new CampusmateClient();
      const result = await client.searchLecture({
        name: opts.name,
        instructor: opts.instructor,
        faculty: opts.faculty,
        semester: opts.semester,
        year: opts.year,
        limit: opts.limit,
      });
      console.log(JSON.stringify(result, null, 2));
    });
}
