---
name: campusmate-syllabus
description: Search Kyushu University (九州大学) syllabus on Campusmate-J. Use when user asks to search lectures, find courses, look up instructors, or get syllabus details from Kyushu University.
---

# Campusmate Syllabus Search

Search the Kyushu University Campusmate-J syllabus system.

## Available Commands

Run via Bash tool from `C:\Users\ta\Documents\campusmate-skill`:

### Search by Lecture Name
```bash
node dist/index.js search-lecture --name "<講義名>" [--instructor "<教員名>"] [--faculty "<学部コード>"] [--year <年度>] [--limit <件数>]
```

### Search by Instructor
```bash
node dist/index.js search-instructor --name "<教員名>" [--department "<所属コード>"] [--year <年度>] [--limit <件数>]
```

### Full-text Search
```bash
node dist/index.js search-fulltext --keyword "<キーワード>" [--match all|any] [--year <年度>] [--limit <件数>]
```

### Get Syllabus Detail
```bash
node dist/index.js detail --code <講義コード> [--year <年度>]
```

## Workflow

1. First, search for lectures using one of the search commands
2. From the results, pick a lecture code
3. Use `detail --code <code>` to get the full syllabus

## Faculty Codes (主な学部コード)

- `001` 基幹教育, `120` 共創学部, `010` 文学部, `020` 教育学部
- `030` 法学部, `040` 経済学部, `050` 理学部, `090` 工学部
- `061` 医学部医学科, `070` 歯学部, `080` 薬学部, `100` 農学部
- `105` 芸術工学部, `620` システム情報科学府, `610` 工学府

## Output

All commands output JSON to stdout. Parse the JSON to present results to the user in a readable format.
