---
name: campusmate-syllabus
description: "Use when the user asks about Kyushu University (九州大学) courses, syllabus, lectures, or instructors, or about their own Campusmate data: grades (成績), GPA, timetable (時間割), notices / messages (お知らせ, 教務連絡). Trigger on mentions of Campusmate, 九大シラバス, lecture search, syllabus lookup, finding courses at Kyushu University, checking what a professor teaches, looking up course details by code, 成績照会, GPA, My時間割, 履修している講義, or 大学からのお知らせ. Also trigger when the user wants to search Japanese university syllabi and Kyushu University is the context."
---

# Campusmate-J Tool

Access the Kyushu University Campusmate-J portal via CLI. The tool scrapes the live portal and returns structured JSON.

- **Syllabus search** — public, no authentication required
- **Grades / GPA / timetable / notices** — the user's own data, requires login with their Kyushu University SSO-KID

## Commands

Run via `npx @severzemlya/campusmate-cli`. All commands output JSON to stdout. Parse the JSON and present results in a readable format — tables work well for search results, structured sections for detail.

### Search by Lecture Name

```bash
npx @severzemlya/campusmate-cli search-lecture --name "<講義名>" [--instructor "<教員名>"] [--faculty "<学部コード>"] [--semester "<開講時期>"] [--year <年度>] [--limit <件数>]
```

### Search by Instructor

Find all lectures taught by an instructor. This performs a two-step lookup (find instructor → fetch their lectures), so it takes a bit longer than other searches.

```bash
npx @severzemlya/campusmate-cli search-instructor --name "<教員名>" [--department "<所属コード>"] [--year <年度>] [--limit <件数>]
```

### Full-text Search

Search across all syllabus content — useful when the user doesn't know the exact lecture name but knows a topic keyword.

```bash
npx @severzemlya/campusmate-cli search-fulltext --keyword "<キーワード>" [--match all|any] [--year <年度>] [--limit <件数>]
```

### Get Syllabus Detail

Retrieve the full syllabus for a specific lecture code. Use this after a search to get complete information.

```bash
npx @severzemlya/campusmate-cli detail --code <講義コード> [--year <年度>]
```

## Logged-in Commands (user's own data)

```bash
npx @severzemlya/campusmate-cli status                     # {"sessionValid": bool, "credentials": "env"|"config"|"none"}
npx @severzemlya/campusmate-cli grades [--year <年度>]      # Course grades (grade S/A/B/C/D/F/R, gp null = not in GPA)
npx @severzemlya/campusmate-cli grades --gpa               # GPA: total, byType, byCategory, byTerm
npx @severzemlya/campusmate-cli timetable [--term 前期|後期] # Registered lectures by day/period + intensive courses
npx @severzemlya/campusmate-cli notices [--type messages|univ|job] [--limit <n>] [--unread]
npx @severzemlya/campusmate-cli notice --id <id> [--type messages|univ|job] [--download [dir]]   # Full text — MARKS IT AS READ
```

### Attachments

`notice` output has `attachments: [{ name, fileId }]`. The file IDs are only valid right after the message is opened, so download in the same call:

```bash
npx @severzemlya/campusmate-cli notice --id <id> --download   # saves to a temp dir; attachments[].path is set
```

Then read the files with the Read tool (PDFs and images are supported) and summarize them for the user. Don't copy attachments elsewhere unless the user asks.

`--type`: `messages` = メッセージ受信一覧 (default), `univ` = 大学からのお知らせ, `job` = 就職のお知らせ. Use the same `--type` for `notice` as the list the ID came from.

### Login handling

- Commands re-login automatically when the session has expired (SSO session → saved credentials).
- If a command fails with a login error, ask the user to run `campusmate-cli login` themselves (in Claude Code: `! npx @severzemlya/campusmate-cli login`). Login prompts for the password on the terminal or reads it from 1Password (`login --op "op://<vault>/<item>"`).
- **Never ask the user to type their SSO-KID or password into the chat**, and never pass credentials on the command line.

### Data handling

- Grades and GPA are personal data — present them to the user, but don't write them to files or send them anywhere unless asked.
- Notices and messages are for university members only. Summarize them for the user; do not republish them.
- `notice` marks the message as read on the portal. Only open messages the user asked about; use `notices` (list) for overviews.
- The tool is read-only. It cannot register courses or change settings — tell the user to use the web portal for that.

## Typical Workflow

1. Search for lectures using one of the three search commands
2. Present the results to the user in a readable format (table recommended)
3. When the user picks a lecture, use `detail --code <code>` to get the full syllabus
4. Present the detail — summarize the purpose and highlight the weekly schedule

## Options Reference

| Option | Description | Default |
|--------|-------------|---------|
| `--year <year>` | Academic year (年度) | Current year |
| `--limit <n>` | Max results to return | 10 |
| `--match all\|any` | Fulltext match mode | all |

Increase `--limit` if the user wants a broader search or the total count suggests more results exist.

## Faculty Codes (主な学部コード)

| Code | Faculty |
|------|---------|
| `001` | 基幹教育 |
| `120` | 共創学部 |
| `010` | 文学部 |
| `020` | 教育学部 |
| `030` | 法学部 |
| `040` | 経済学部 |
| `050` | 理学部 |
| `090` | 工学部 |
| `061` | 医学部医学科 |
| `070` | 歯学部 |
| `080` | 薬学部 |
| `100` | 農学部 |
| `105` | 芸術工学部 |
| `620` | システム情報科学府 |
| `610` | 工学府 |

## Important Considerations

- This tool hits a live university portal. Avoid rapid-fire requests or large batch operations — be a good citizen. Don't loop over many `notice` calls or poll periodically.
- This is an unofficial tool, used at the user's own risk under university regulations.
- If a search returns 0 results, try broader terms or different search types before concluding the lecture doesn't exist.
- Japanese input works directly (e.g., `--name "線形代数"`). Mixing Japanese and English is fine for fulltext search.
