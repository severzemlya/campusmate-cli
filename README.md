# @severzemlya/campusmate-cli

A CLI tool for the Kyushu University (九州大学) Campusmate-J portal: syllabus search, plus your own grades, timetable and notices after logging in. Returns structured JSON, designed for use as a [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skill.

## Features

- **Lecture search** — search by lecture name, instructor, faculty, semester
- **Instructor search** — find all lectures by an instructor (two-step lookup)
- **Full-text search** — search across all syllabus content
- **Detail retrieval** — get complete syllabus for a specific lecture code
- **Logged-in features** (via Kyushu University SSO)
  - **Grades & GPA** — course grades, GPA by category and by term
  - **Timetable** — your registered lectures by day and period (first / second term)
  - **Notices & messages** — lists (with unread filter) and full text

## Disclaimer

- **This is an unofficial tool.** It is not affiliated with Kyushu University or the provider of Campusmate.
- **Use at your own risk.** The author takes no responsibility for any consequences of using this tool ([MIT License](LICENSE)). You are responsible for complying with university regulations such as the Kyushu University Information Ethics Regulations.
- **Use it only with your own account.** Do not handle other people's SSO-KID or password, or log in on someone else's behalf.
- **Keep the load low.** Requests are sent sequentially with a delay, but avoid running many commands in a short time or crawling the portal periodically.
- **Handle retrieved data with care.** Grades are personal data, and notices / messages are intended for university members only — do not republish them.
- **Read-only.** The tool never submits course registration or settings forms. Note that opening a message with `notice` marks it as read on the portal.

## Requirements

- Node.js 20+
- Network access to `ku-portal.kyushu-u.ac.jp`

## Usage

No installation required — just use `npx`:

```bash
npx @severzemlya/campusmate-cli search-lecture --name "線形代数"
npx @severzemlya/campusmate-cli search-lecture --name "物理" --faculty "050" --limit 20
npx @severzemlya/campusmate-cli search-instructor --name "田中"
npx @severzemlya/campusmate-cli search-fulltext --keyword "機械学習"
npx @severzemlya/campusmate-cli detail --code 26533320
```

Or install globally:

```bash
npm install -g @severzemlya/campusmate-cli
campusmate-cli search-lecture --name "線形代数"
```

### Common Options

| Option | Description | Default |
|--------|-------------|---------|
| `--year <year>` | Academic year | Current year |
| `--limit <n>` | Max results to return | 10 |

## Logged-in Features

### Login

```bash
# Enter your SSO-KID and password on the terminal (not stored)
campusmate-cli login

# Use a 1Password item (its username / password fields). Only the reference is stored.
campusmate-cli login --op "op://Personal/<item name or ID>"

# Or environment variables (op:// references are accepted as values)
CAMPUSMATE_USERNAME=... CAMPUSMATE_PASSWORD=... campusmate-cli login
```

Session cookies are stored in `~/.config/campusmate-cli/session.json` (mode 600). When the session has expired, commands log in again automatically:

1. If the SSO (IdP) session is still alive, re-login without a password
2. Otherwise use credentials from environment variables or the config file (1Password reference)
3. If neither is available, the command fails — run `campusmate-cli login` again

Plain-text passwords are never written to disk.

```bash
campusmate-cli status            # Whether the session is valid, and where credentials come from
campusmate-cli logout            # Log out and delete the session
campusmate-cli logout --forget   # Also remove the 1Password reference from the config
```

### Commands

```bash
campusmate-cli grades                      # Course grades
campusmate-cli grades --year 2026          # Filter by academic year
campusmate-cli grades --gpa                # GPA (total, by category, by term)
campusmate-cli timetable                   # Timetable (current term)
campusmate-cli timetable --term 前期       # 前期 (1) / 後期 (2)
campusmate-cli notices                     # Received messages
campusmate-cli notices --type univ --limit 20 --unread   # University notices (unread only)
campusmate-cli notices --type job          # Career notices
campusmate-cli notice --id 2300001 --type univ           # Full text (marks it as read)
```

| `--type` | Content |
|----------|---------|
| `messages` | Received messages (default) |
| `univ` | Notices from the university |
| `job` | Career / job-hunting notices |

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

This tool includes a [Claude Code skill](https://docs.anthropic.com/en/docs/claude-code/skills) definition at [`skills/campusmate-skill/SKILL.md`](skills/campusmate-skill/SKILL.md).

Copy the skill directory to your Claude Code skills location:

```bash
cp -r skills/campusmate-skill ~/.claude/skills/
```

After registering, Claude Code will automatically use this skill when you ask about Kyushu University courses, syllabi, or instructors. For example:

```
> 九大の線形代数の講義を検索して
> What courses does Professor Tanaka teach at Kyushu University?
> 講義コード 26533320 のシラバスを見せて
```

## Development

```bash
npm install
npm run build       # Compile TypeScript
npm test            # Run tests
npm run test:watch  # Watch mode
```

## Tech Stack

- TypeScript (ESM, Node16 module resolution)
- [Commander](https://github.com/tj/commander.js) — CLI framework
- [Axios](https://github.com/axios/axios) — HTTP client
- [Cheerio](https://github.com/cheeriojs/cheerio) — HTML parsing
- [tough-cookie](https://github.com/salesforce/tough-cookie) — Cookie handling
- [Vitest](https://vitest.dev/) — Test framework

## License

MIT
