# campusmate-skill

A CLI tool for searching the Kyushu University (九州大学) Campusmate-J syllabus system. Returns structured JSON, designed for use as a [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skill.

## Features

- **Lecture search** — search by lecture name, instructor, faculty, semester
- **Instructor search** — find all lectures by an instructor (two-step lookup)
- **Full-text search** — search across all syllabus content
- **Detail retrieval** — get complete syllabus for a specific lecture code

## Requirements

- Node.js 20+
- Network access to `ku-portal.kyushu-u.ac.jp`

## Installation

```bash
git clone https://github.com/<owner>/campusmate-skill.git
cd campusmate-skill
npm install
npm run build
```

## Usage

All commands output JSON to stdout.

### Search by Lecture Name

```bash
node dist/index.js search-lecture --name "線形代数"
node dist/index.js search-lecture --name "物理" --faculty "050" --limit 20
```

### Search by Instructor

```bash
node dist/index.js search-instructor --name "田中"
```

### Full-text Search

```bash
node dist/index.js search-fulltext --keyword "機械学習"
node dist/index.js search-fulltext --keyword "deep learning" --match any
```

### Get Syllabus Detail

```bash
node dist/index.js detail --code 26533320
```

### Common Options

| Option | Description | Default |
|--------|-------------|---------|
| `--year <year>` | Academic year | Current year |
| `--limit <n>` | Max results to return | 10 |

## Output Format

### Search Result

```json
{
  "total": 38,
  "count": 10,
  "results": [
    {
      "code": "26533320",
      "name": "線形代数学・同演習A",
      "semester": "前期",
      "schedule": "火3",
      "instructor": "山田 太郎"
    }
  ]
}
```

### Syllabus Detail

```json
{
  "code": "26533320",
  "name": "線形代数学・同演習A",
  "instructor": "山田 太郎",
  "credits": 3,
  "year": 2026,
  "semester": "前期",
  "schedule": "火3",
  "purpose": "...",
  "syllabus": [
    { "week": 1, "theme": "ガイダンス", "content": "..." }
  ]
}
```

See [`src/types.ts`](src/types.ts) for full type definitions.

## Claude Code Skill Setup

This tool is designed to be registered as a [Claude Code skill](https://docs.anthropic.com/en/docs/claude-code/skills). The skill definition is in [`skill.md`](skill.md).

### Option A: Project-level configuration

Add to `.claude/settings.json` in the project where you want the skill available:

```json
{
  "skills": [
    "/path/to/campusmate-skill"
  ]
}
```

### Option B: User-level configuration (available in all projects)

Add to `~/.claude/settings.json`:

```json
{
  "skills": [
    "/path/to/campusmate-skill"
  ]
}
```

### Option C: Use the CLI

```bash
claude skill add /path/to/campusmate-skill
```

### Verify

After registering, Claude Code will automatically use this skill when you ask about Kyushu University courses, syllabi, or instructors. For example:

```
> 九大の線形代数の講義を検索して
> What courses does Professor Tanaka teach at Kyushu University?
> 講義コード 26533320 のシラバスを見せて
```

## Development

```bash
npm run build       # Compile TypeScript
npm test            # Run tests (51 tests)
npm run test:watch  # Watch mode
```

## Tech Stack

- TypeScript (ESM, Node16 module resolution)
- [Commander](https://github.com/tj/commander.js) — CLI framework
- [Axios](https://github.com/axios/axios) — HTTP client
- [Cheerio](https://github.com/cheeriojs/cheerio) — HTML parsing
- [Vitest](https://vitest.dev/) — Test framework

## License

MIT
