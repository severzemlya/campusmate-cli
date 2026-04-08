#!/usr/bin/env node
import { Command } from "commander";
import { registerSearchLecture } from "./commands/search-lecture.js";
import { registerSearchInstructor } from "./commands/search-instructor.js";
import { registerSearchFulltext } from "./commands/search-fulltext.js";
import { registerDetail } from "./commands/detail.js";

const program = new Command();

program
  .name("campusmate-cli")
  .description("九州大学 Campusmate-J シラバス検索CLI")
  .version("1.0.0");

registerSearchLecture(program);
registerSearchInstructor(program);
registerSearchFulltext(program);
registerDetail(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
