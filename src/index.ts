#!/usr/bin/env node
import { Command } from "commander";
import { registerSearchLecture } from "./commands/search-lecture.js";
import { registerSearchInstructor } from "./commands/search-instructor.js";
import { registerSearchFulltext } from "./commands/search-fulltext.js";
import { registerDetail } from "./commands/detail.js";
import { registerLogin } from "./commands/login.js";
import { registerGrades } from "./commands/grades.js";
import { registerTimetable } from "./commands/timetable.js";
import { registerNotices } from "./commands/notices.js";

const program = new Command();

program
  .name("campusmate-cli")
  .description("九州大学 Campusmate-J CLI (シラバス検索 / ログイン後の成績・時間割・お知らせ)")
  .version("1.2.0");

registerSearchLecture(program);
registerSearchInstructor(program);
registerSearchFulltext(program);
registerDetail(program);
registerLogin(program);
registerGrades(program);
registerTimetable(program);
registerNotices(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
