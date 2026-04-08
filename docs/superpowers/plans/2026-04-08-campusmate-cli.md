# Campusmate Syllabus CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI tool that searches Kyushu University's Campusmate-J syllabus system via HTTP and outputs JSON, then register it as a Claude Code skill.

**Architecture:** A TypeScript CLI using commander for subcommands, axios for HTTP requests with cookie handling, and cheerio for HTML parsing. Each search type (lecture, instructor, fulltext) and detail view is a separate command module. Output is JSON to stdout.

**Tech Stack:** TypeScript, commander, axios, cheerio, vitest

---

## File Structure

```
campusmate-cli/
├── src/
│   ├── index.ts                  # CLI entry point, commander setup
│   ├── client.ts                 # HTTP session, GET/POST with cookies, pagination
│   ├── parsers.ts                # cheerio-based HTML parsing (results table, detail page)
│   ├── types.ts                  # SearchResult, SyllabusDetail, command option types
│   └── commands/
│       ├── search-lecture.ts     # search-lecture subcommand
│       ├── search-instructor.ts  # search-instructor subcommand
│       ├── search-fulltext.ts    # search-fulltext subcommand
│       └── detail.ts            # detail subcommand
├── tests/
│   ├── fixtures/
│   │   ├── search-results.html   # Saved HTML from a real search results page
│   │   ├── detail-page.html      # Saved HTML from a real syllabus detail page
│   │   └── no-results.html       # Saved HTML for 0-result case
│   ├── parsers.test.ts           # Unit tests for HTML parsing
│   └── client.test.ts            # Unit tests for client (mocked HTTP)
├── package.json
├── tsconfig.json
└── skill.md                      # Claude Code skill definition
```

---

### Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`

- [ ] **Step 1: Initialize npm project**

Run:
```bash
cd /c/Users/ta/Documents/campusmate-skill
npm init -y
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install commander axios cheerio
npm install -D typescript @types/node vitest
```

- [ ] **Step 3: Create tsconfig.json**

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Update package.json**

Add to `package.json`:
```json
{
  "type": "module",
  "bin": {
    "campusmate": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 5: Create src directory structure**

Run:
```bash
mkdir -p src/commands tests/fixtures
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json
git commit -m "feat: initialize project with TypeScript and dependencies"
```

---

### Task 2: Type Definitions

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Write type definitions**

Create `src/types.ts`:
```typescript
export interface SearchResultItem {
  code: string;
  name: string;
  semester: string;
  schedule: string;
  instructor: string;
}

export interface SearchResponse {
  total: number;
  count: number;
  results: SearchResultItem[];
}

export interface SyllabusWeek {
  week: number;
  theme: string;
  content: string;
}

export interface SyllabusDetail {
  code: string;
  name: string;
  topic: string;
  numberingCode: string;
  instructor: string;
  credits: number;
  year: number;
  semester: string;
  schedule: string;
  campus: string;
  language: string;
  category: string;
  targetYear: string;
  purpose: string;
  purposeEn: string;
  keywords: string;
  notes: string;
  teachingMethod: string;
  remoteLecture: string;
  moodle: string;
  materials: string;
  textbook: string;
  references: string;
  grading: string;
  syllabus: SyllabusWeek[];
  consultation: string;
  accommodation: string;
}

export interface LectureSearchOptions {
  name?: string;
  instructor?: string;
  faculty?: string;
  semester?: string;
  year?: number;
  limit?: number;
}

export interface InstructorSearchOptions {
  name: string;
  department?: string;
  year?: number;
  limit?: number;
}

export interface FulltextSearchOptions {
  keyword: string;
  match?: "all" | "any";
  year?: number;
  limit?: number;
}

export interface DetailOptions {
  code: string;
  year?: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add type definitions for search results and syllabus detail"
```

---

### Task 3: HTML Parsers with Tests

**Files:**
- Create: `tests/fixtures/search-results.html`
- Create: `tests/fixtures/detail-page.html`
- Create: `tests/fixtures/no-results.html`
- Create: `tests/parsers.test.ts`
- Create: `src/parsers.ts`

- [ ] **Step 1: Save HTML fixtures**

Use the Chrome DevTools MCP to capture real HTML from:
1. A search results page (e.g. search for "線形代数") — save to `tests/fixtures/search-results.html`
2. A syllabus detail page (e.g. code 26533320) — save to `tests/fixtures/detail-page.html`
3. A search with 0 results — save to `tests/fixtures/no-results.html`

Run in the browser console via `evaluate_script` or save the page HTML:
```typescript
// For each page, capture document.documentElement.outerHTML
// and save to the fixture files
```

- [ ] **Step 2: Write failing tests for parseSearchResults**

Create `tests/parsers.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { parseSearchResults, parseDetailPage } from "../src/parsers.js";

const resultsHtml = readFileSync("tests/fixtures/search-results.html", "utf-8");
const detailHtml = readFileSync("tests/fixtures/detail-page.html", "utf-8");
const noResultsHtml = readFileSync("tests/fixtures/no-results.html", "utf-8");

describe("parseSearchResults", () => {
  it("parses a results table into SearchResultItem[]", () => {
    const result = parseSearchResults(resultsHtml);
    expect(result.total).toBeGreaterThan(0);
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0]).toHaveProperty("code");
    expect(result.results[0]).toHaveProperty("name");
    expect(result.results[0]).toHaveProperty("semester");
    expect(result.results[0]).toHaveProperty("schedule");
    expect(result.results[0]).toHaveProperty("instructor");
  });

  it("extracts correct data from the first result row", () => {
    const result = parseSearchResults(resultsHtml);
    // Values will be confirmed after fixture is captured
    expect(result.results[0].code).toMatch(/^\d+$/);
    expect(result.results[0].name.length).toBeGreaterThan(0);
  });

  it("returns total=0 and empty results for no-result page", () => {
    const result = parseSearchResults(noResultsHtml);
    expect(result.total).toBe(0);
    expect(result.results).toEqual([]);
  });
});

describe("parseDetailPage", () => {
  it("parses a detail page into SyllabusDetail", () => {
    const detail = parseDetailPage(detailHtml);
    expect(detail.name.length).toBeGreaterThan(0);
    expect(detail.instructor.length).toBeGreaterThan(0);
    expect(detail.credits).toBeGreaterThanOrEqual(0);
    expect(detail.year).toBeGreaterThan(2000);
  });

  it("parses weekly syllabus schedule", () => {
    const detail = parseDetailPage(detailHtml);
    expect(detail.syllabus.length).toBeGreaterThan(0);
    expect(detail.syllabus[0]).toHaveProperty("week");
    expect(detail.syllabus[0]).toHaveProperty("theme");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/parsers.test.ts`
Expected: FAIL — `parseSearchResults` and `parseDetailPage` not found

- [ ] **Step 4: Implement parseSearchResults**

Create `src/parsers.ts`:
```typescript
import * as cheerio from "cheerio";
import type { SearchResponse, SearchResultItem, SyllabusDetail, SyllabusWeek } from "./types.js";

export function parseSearchResults(html: string): SearchResponse {
  const $ = cheerio.load(html);

  // Check for "X件中" total count text like "1-10件表示/38件中"
  const paginationText = $("body").text();
  const totalMatch = paginationText.match(/(\d+)件中/);
  const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;

  if (total === 0) {
    return { total: 0, count: 0, results: [] };
  }

  const results: SearchResultItem[] = [];

  // Results are in a table. Each row has: No, 講義コード, 講義名(link), 開講期間, 曜日・時限, 担当教員
  // Find the table that contains "講義コード" header
  $("table").each((_, table) => {
    const headerText = $(table).find("td").first().text().trim();
    $(table).find("tr").each((rowIdx, row) => {
      const cells = $(row).find("td");
      if (cells.length < 5) return;

      const noText = $(cells[0]).text().trim();
      if (!/^\d+$/.test(noText)) return; // skip header rows

      const code = $(cells[1]).text().trim();
      const name = $(cells[2]).text().trim();
      const semesterSchedule = $(cells[3]).text().trim();
      const instructor = $(cells[4]).text().trim();

      // Split "前期 火曜日 2時限" into semester and schedule
      const parts = semesterSchedule.split(/\s+/);
      const semester = parts[0] || "";
      const schedule = parts.slice(1).join(" ");

      results.push({ code, name, semester, schedule, instructor });
    });
  });

  return { total, count: results.length, results };
}

export function parseDetailPage(html: string): SyllabusDetail {
  const $ = cheerio.load(html);

  const getField = (label: string): string => {
    let value = "";
    $("td.label_kougi").each((_, el) => {
      if ($(el).text().trim() === label) {
        value = $(el).next("td").text().trim();
      }
    });
    return value;
  };

  const getLabeledField = (label: string): string => {
    let value = "";
    $("td").each((_, el) => {
      const bg = $(el).css("background-color") || $(el).attr("bgcolor") || "";
      if ($(el).text().trim() === label) {
        value = $(el).next("td").text().trim();
      }
    });
    return value;
  };

  // Parse weekly syllabus from the schedule table
  const syllabus: SyllabusWeek[] = [];
  let inScheduleSection = false;
  $("td").each((_, el) => {
    const text = $(el).text().trim();
    if (text === "授業計画") inScheduleSection = true;
  });

  // Find rows with week numbers in the schedule table
  $("tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length >= 3) {
      const weekText = $(cells[0]).text().trim();
      if (/^\d+$/.test(weekText)) {
        const week = parseInt(weekText, 10);
        const theme = $(cells[1]).text().trim();
        const content = cells.length > 2 ? $(cells[2]).text().trim() : "";
        if (theme && week <= 20) {
          syllabus.push({ week, theme, content });
        }
      }
    }
  });

  const creditsStr = getField("単位数");

  return {
    code: "", // Will be set from URL or caller
    name: getField("科目名称"),
    topic: getLabeledField("講義題目"),
    numberingCode: getField("科目ナンバリング・コード"),
    instructor: getField("担当教員"),
    credits: creditsStr ? parseInt(creditsStr, 10) : 0,
    year: parseInt(getField("開講年度") || "0", 10),
    semester: getField("開講学期"),
    schedule: getField("曜日時限"),
    campus: getField("開講地区"),
    language: getField("使用言語"),
    category: getField("授業科目区分"),
    targetYear: getField("対象学年"),
    purpose: getLabeledField("授業科目の目的（日本語）"),
    purposeEn: getLabeledField("授業科目の目的（英語）"),
    keywords: getLabeledField("キーワード"),
    notes: getLabeledField("授業科目に関する特筆事項"),
    teachingMethod: getLabeledField("授業の方法"),
    remoteLecture: getLabeledField("遠隔授業"),
    moodle: getLabeledField("Moodleコース情報"),
    materials: getLabeledField("使用する教材"),
    textbook: getLabeledField("テキスト"),
    references: getLabeledField("参考書等"),
    grading: getLabeledField("レポート"),
    syllabus,
    consultation: getLabeledField("担当教員による学習相談"),
    accommodation: getLabeledField("合理的配慮について"),
  };
}
```

Note: The exact parsing selectors will likely need tuning after running against real fixtures. The implementation above is a starting point — adjust based on actual HTML structure in the fixture files.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/parsers.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/parsers.ts tests/parsers.test.ts tests/fixtures/
git commit -m "feat: add HTML parsers for search results and detail pages"
```

---

### Task 4: HTTP Client

**Files:**
- Create: `src/client.ts`
- Create: `tests/client.test.ts`

- [ ] **Step 1: Write failing test for CampusmateClient**

Create `tests/client.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { CampusmateClient } from "../src/client.js";

describe("CampusmateClient", () => {
  it("buildLectureSearchForm constructs correct form data", () => {
    const client = new CampusmateClient();
    const form = client.buildLectureSearchForm({
      name: "線形代数",
      year: 2026,
    });
    expect(form.get("value(kouginm)")).toBe("線形代数");
    expect(form.get("value(nendo)")).toBe("2026");
    expect(form.get("value(methodname)")).toBe("sylkougi_search");
  });

  it("buildInstructorSearchForm constructs correct form data", () => {
    const client = new CampusmateClient();
    const form = client.buildInstructorSearchForm({
      name: "平良",
      year: 2026,
    });
    expect(form.get("value(syonamk)")).toBe("平良");
    expect(form.get("value(nendo)")).toBe("2026");
  });

  it("buildFulltextSearchForm constructs correct form data", () => {
    const client = new CampusmateClient();
    const form = client.buildFulltextSearchForm({
      keyword: "量子力学",
      match: "all",
      year: 2026,
    });
    expect(form.get("value(keywords)")).toBe("量子力学");
    expect(form.get("value(searchKeywordFlg)")).toBe("1");
    expect(form.get("value(nendo)")).toBe("2026");
  });

  it("getDetailUrl constructs correct URL", () => {
    const client = new CampusmateClient();
    const url = client.getDetailUrl("26533320", 2026);
    expect(url).toContain("slbssbdr.do");
    expect(url).toContain("value(kougicd)=26533320");
    expect(url).toContain("value(risyunen)=2026");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/client.test.ts`
Expected: FAIL — `CampusmateClient` not found

- [ ] **Step 3: Implement CampusmateClient**

Create `src/client.ts`:
```typescript
import axios, { type AxiosInstance } from "axios";
import type {
  LectureSearchOptions,
  InstructorSearchOptions,
  FulltextSearchOptions,
  SearchResponse,
  SyllabusDetail,
} from "./types.js";
import { parseSearchResults, parseDetailPage } from "./parsers.js";

const BASE_URL = "https://ku-portal.kyushu-u.ac.jp/campusweb/";

export class CampusmateClient {
  private http: AxiosInstance;
  private cookies: string[] = [];

  constructor() {
    this.http = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      maxRedirects: 5,
      headers: {
        "User-Agent": "campusmate-cli/1.0",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  }

  private async initSession(path: string): Promise<void> {
    const res = await this.http.get(path, {
      params: { clearAccessData: "true" },
    });
    const setCookies = res.headers["set-cookie"];
    if (setCookies) {
      this.cookies = setCookies.map((c: string) => c.split(";")[0]);
    }
  }

  private getCookieHeader(): string {
    return this.cookies.join("; ");
  }

  private currentYear(): number {
    return new Date().getFullYear();
  }

  buildLectureSearchForm(opts: LectureSearchOptions): URLSearchParams {
    const params = new URLSearchParams();
    params.set("value(methodname)", "sylkougi_search");
    params.set("buttonName", "");
    params.set("timestamp", Date.now().toString());
    params.set("value(nendo)", String(opts.year ?? this.currentYear()));
    params.set("value(campuscd)", "");
    if (opts.name) params.set("value(kouginm)", opts.name);
    if (opts.instructor) params.set("value(syokunm)", opts.instructor);
    if (opts.faculty) params.set("values(multiKaikoSyozoku)", opts.faculty);
    if (opts.semester) params.set("value(kaikoCd)", opts.semester);
    return params;
  }

  buildInstructorSearchForm(opts: InstructorSearchOptions): URLSearchParams {
    const params = new URLSearchParams();
    params.set("buttonName", "");
    params.set("timestamp", Date.now().toString());
    params.set("value(nendo)", String(opts.year ?? this.currentYear()));
    params.set("value(syonamk)", opts.name);
    if (opts.department) params.set("value(syozkcd)", opts.department);
    return params;
  }

  buildFulltextSearchForm(opts: FulltextSearchOptions): URLSearchParams {
    const params = new URLSearchParams();
    params.set("buttonName", "");
    params.set("timestamp", Date.now().toString());
    params.set("value(nendo)", String(opts.year ?? this.currentYear()));
    params.set("value(keywords)", opts.keyword);
    params.set("value(searchKeywordFlg)", opts.match === "any" ? "2" : "1");
    return params;
  }

  getDetailUrl(code: string, year?: number): string {
    const y = year ?? this.currentYear();
    return `${BASE_URL}slbssbdr.do?value(risyunen)=${y}&value(semekikn)=1&value(kougicd)=${code}&value(crclumcd)=ZZ`;
  }

  async searchLecture(opts: LectureSearchOptions): Promise<SearchResponse> {
    await this.initSession("slbsskgr.do");
    const form = this.buildLectureSearchForm(opts);
    const limit = opts.limit ?? 10;

    const res = await this.http.post("slbsskgr.do", form.toString(), {
      headers: { Cookie: this.getCookieHeader() },
    });

    const firstPage = parseSearchResults(res.data);
    let allResults = [...firstPage.results];

    // Fetch additional pages if needed
    while (allResults.length < limit && allResults.length < firstPage.total) {
      const nextForm = new URLSearchParams(form);
      nextForm.set("buttonName", "forward");
      const nextRes = await this.http.post("slbsskgr.do", nextForm.toString(), {
        headers: { Cookie: this.getCookieHeader() },
      });
      const nextPage = parseSearchResults(nextRes.data);
      if (nextPage.results.length === 0) break;
      allResults.push(...nextPage.results);
    }

    const trimmed = allResults.slice(0, limit);
    return { total: firstPage.total, count: trimmed.length, results: trimmed };
  }

  async searchInstructor(opts: InstructorSearchOptions): Promise<SearchResponse> {
    await this.initSession("slbsskyr.do");
    const form = this.buildInstructorSearchForm(opts);
    const limit = opts.limit ?? 10;

    const res = await this.http.post("slbsskyr.do", form.toString(), {
      headers: { Cookie: this.getCookieHeader() },
    });

    const firstPage = parseSearchResults(res.data);
    let allResults = [...firstPage.results];

    while (allResults.length < limit && allResults.length < firstPage.total) {
      const nextForm = new URLSearchParams(form);
      nextForm.set("buttonName", "forward");
      const nextRes = await this.http.post("slbsskyr.do", nextForm.toString(), {
        headers: { Cookie: this.getCookieHeader() },
      });
      const nextPage = parseSearchResults(nextRes.data);
      if (nextPage.results.length === 0) break;
      allResults.push(...nextPage.results);
    }

    const trimmed = allResults.slice(0, limit);
    return { total: firstPage.total, count: trimmed.length, results: trimmed };
  }

  async searchFulltext(opts: FulltextSearchOptions): Promise<SearchResponse> {
    await this.initSession("slbsskwr.do");
    const form = this.buildFulltextSearchForm(opts);
    const limit = opts.limit ?? 10;

    const res = await this.http.post("slbsskwr.do", form.toString(), {
      headers: { Cookie: this.getCookieHeader() },
    });

    const firstPage = parseSearchResults(res.data);
    let allResults = [...firstPage.results];

    while (allResults.length < limit && allResults.length < firstPage.total) {
      const nextForm = new URLSearchParams(form);
      nextForm.set("buttonName", "forward");
      const nextRes = await this.http.post("slbsskwr.do", nextForm.toString(), {
        headers: { Cookie: this.getCookieHeader() },
      });
      const nextPage = parseSearchResults(nextRes.data);
      if (nextPage.results.length === 0) break;
      allResults.push(...nextPage.results);
    }

    const trimmed = allResults.slice(0, limit);
    return { total: firstPage.total, count: trimmed.length, results: trimmed };
  }

  async getDetail(code: string, year?: number): Promise<SyllabusDetail> {
    const url = this.getDetailUrl(code, year);
    const res = await this.http.get(url);
    const detail = parseDetailPage(res.data);
    detail.code = code;
    return detail;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/client.test.ts`
Expected: PASS (unit tests for form building and URL construction)

- [ ] **Step 5: Commit**

```bash
git add src/client.ts tests/client.test.ts
git commit -m "feat: add HTTP client with session management and pagination"
```

---

### Task 5: CLI Commands

**Files:**
- Create: `src/commands/search-lecture.ts`
- Create: `src/commands/search-instructor.ts`
- Create: `src/commands/search-fulltext.ts`
- Create: `src/commands/detail.ts`
- Create: `src/index.ts`

- [ ] **Step 1: Create search-lecture command**

Create `src/commands/search-lecture.ts`:
```typescript
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
```

- [ ] **Step 2: Create search-instructor command**

Create `src/commands/search-instructor.ts`:
```typescript
import type { Command } from "commander";
import { CampusmateClient } from "../client.js";

export function registerSearchInstructor(program: Command): void {
  program
    .command("search-instructor")
    .description("教員名からシラバスを検索")
    .requiredOption("--name <name>", "教員氏名")
    .option("--department <code>", "教員所属コード")
    .option("--year <year>", "年度", parseInt)
    .option("--limit <limit>", "取得件数", parseInt, 10)
    .action(async (opts) => {
      const client = new CampusmateClient();
      const result = await client.searchInstructor({
        name: opts.name,
        department: opts.department,
        year: opts.year,
        limit: opts.limit,
      });
      console.log(JSON.stringify(result, null, 2));
    });
}
```

- [ ] **Step 3: Create search-fulltext command**

Create `src/commands/search-fulltext.ts`:
```typescript
import type { Command } from "commander";
import { CampusmateClient } from "../client.js";

export function registerSearchFulltext(program: Command): void {
  program
    .command("search-fulltext")
    .description("キーワードでシラバスを全文検索")
    .requiredOption("--keyword <keyword>", "検索キーワード")
    .option("--match <mode>", "マッチモード (all|any)", "all")
    .option("--year <year>", "年度", parseInt)
    .option("--limit <limit>", "取得件数", parseInt, 10)
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
```

- [ ] **Step 4: Create detail command**

Create `src/commands/detail.ts`:
```typescript
import type { Command } from "commander";
import { CampusmateClient } from "../client.js";

export function registerDetail(program: Command): void {
  program
    .command("detail")
    .description("講義コードからシラバス詳細を取得")
    .requiredOption("--code <code>", "講義コード")
    .option("--year <year>", "年度", parseInt)
    .action(async (opts) => {
      const client = new CampusmateClient();
      const result = await client.getDetail(opts.code, opts.year);
      console.log(JSON.stringify(result, null, 2));
    });
}
```

- [ ] **Step 5: Create CLI entry point**

Create `src/index.ts`:
```typescript
#!/usr/bin/env node
import { Command } from "commander";
import { registerSearchLecture } from "./commands/search-lecture.js";
import { registerSearchInstructor } from "./commands/search-instructor.js";
import { registerSearchFulltext } from "./commands/search-fulltext.js";
import { registerDetail } from "./commands/detail.js";

const program = new Command();

program
  .name("campusmate")
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
```

- [ ] **Step 6: Build and verify CLI help**

Run:
```bash
npx tsc
node dist/index.js --help
```

Expected: CLI help showing all 4 subcommands

- [ ] **Step 7: Commit**

```bash
git add src/index.ts src/commands/
git commit -m "feat: add CLI commands for search-lecture, search-instructor, search-fulltext, detail"
```

---

### Task 6: Integration Test with Live Site

**Files:** (no new files, manual verification)

- [ ] **Step 1: Test search-lecture against live site**

Run:
```bash
node dist/index.js search-lecture --name "線形代数" --limit 3
```

Expected: JSON output with results array containing lectures matching "線形代数"

- [ ] **Step 2: Test search-instructor against live site**

Run:
```bash
node dist/index.js search-instructor --name "平良"
```

Expected: JSON output with results from instructor named "平良"

- [ ] **Step 3: Test search-fulltext against live site**

Run:
```bash
node dist/index.js search-fulltext --keyword "量子力学"
```

Expected: JSON output with results containing "量子力学"

- [ ] **Step 4: Test detail against live site**

Run:
```bash
node dist/index.js detail --code 26533320
```

Expected: JSON output with full syllabus detail for lecture code 26533320

- [ ] **Step 5: Fix any parsing issues found during integration testing**

Adjust `src/parsers.ts` selectors based on actual HTML structure if tests reveal parsing errors. Rebuild and retest after each fix.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: adjust HTML parsers based on integration testing"
```

---

### Task 7: Claude Code Skill Registration

**Files:**
- Create: `skill.md`

- [ ] **Step 1: Create skill definition file**

Create `skill.md` in project root:
```markdown
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

## Notes

- Default year is the current year
- Default limit is 10 results
- The site is Shift_JIS encoded; the CLI handles encoding internally
```

- [ ] **Step 2: Verify skill is detected**

Ask user to run `/reload-plugins` or restart Claude Code, then test by saying "九大のシラバスで線形代数を検索して".

- [ ] **Step 3: Commit**

```bash
git add skill.md
git commit -m "feat: add Claude Code skill definition for syllabus search"
```

---

### Task 8: Final Cleanup

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Ensure package.json has correct bin entry and build works**

Run:
```bash
npm run build
```

Expected: Clean build with no errors

- [ ] **Step 2: Run all tests**

Run:
```bash
npm test
```

Expected: All tests pass

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup and build verification"
```
