---
name: campusmate-syllabus
description: "Use when the user asks about Kyushu University (九州大学) courses, syllabus, lectures, or instructors. Trigger on mentions of Campusmate, 九大シラバス, lecture search, syllabus lookup, finding courses at Kyushu University, checking what a professor teaches, or looking up course details by code. Also trigger when the user wants to search Japanese university syllabi and Kyushu University is the context."
---

# Campusmate-J Syllabus Search Tool

Search the Kyushu University Campusmate-J syllabus system via CLI. The tool scrapes the live Campusmate-J portal and returns structured JSON — no API key, authentication, or local setup required.

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

- This tool hits a live university portal. Avoid rapid-fire requests or large batch operations — be a good citizen.
- If a search returns 0 results, try broader terms or different search types before concluding the lecture doesn't exist.
- Japanese input works directly (e.g., `--name "線形代数"`). Mixing Japanese and English is fine for fulltext search.
