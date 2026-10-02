import type { Command } from "commander";
import { PortalClient } from "../portal.js";
import { parsePositiveInt } from "../validate.js";

export function registerGrades(program: Command): void {
  program
    .command("grades")
    .description("成績一覧を取得 (要ログイン)")
    .option("--year <year>", "年度で絞り込み", parsePositiveInt)
    .option("--gpa", "成績一覧の代わりに GPA を取得")
    .action(async (opts) => {
      const client = await PortalClient.open();
      if (opts.gpa) {
        console.log(JSON.stringify(await client.gpa(), null, 2));
        return;
      }
      const result = await client.grades();
      const courses = opts.year ? result.courses.filter((c) => c.year === opts.year) : result.courses;
      console.log(JSON.stringify({ count: courses.length, courses }, null, 2));
    });
}
