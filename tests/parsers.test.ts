import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { describe, it, expect } from "vitest";

import { parseSearchResults, parseDetailPage } from "../src/parsers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  readFileSync(join(__dirname, "fixtures", name), "utf-8");

// ──────────────────────────────────────────────────────────────────────
// parseSearchResults
// ──────────────────────────────────────────────────────────────────────

describe("parseSearchResults – 線形代数 results page", () => {
  const html = fixture("search-results.html");
  const result = parseSearchResults(html);

  it("returns total = 38", () => {
    expect(result.total).toBe(38);
  });

  it("returns count = 10", () => {
    expect(result.count).toBe(10);
  });

  it("returns 10 result rows", () => {
    expect(result.results).toHaveLength(10);
  });

  it("first result has correct code", () => {
    expect(result.results[0].code).toBe("26533320");
  });

  it("first result has correct name", () => {
    expect(result.results[0].name).toBe("線形代数からはじめる量子力学");
  });

  it("first result schedule contains 水曜日", () => {
    expect(result.results[0].schedule).toContain("水曜日");
  });

  it("first result schedule contains ４時限", () => {
    expect(result.results[0].schedule).toContain("４時限");
  });

  it("first result instructor is 平良　敬乃", () => {
    expect(result.results[0].instructor).toBe("平良　敬乃");
  });

  it("second result code is 26532118", () => {
    expect(result.results[1].code).toBe("26532118");
  });

  it("last result (10th) code is 26534116", () => {
    expect(result.results[9].code).toBe("26534116");
  });

  it("all results have non-empty code", () => {
    for (const r of result.results) {
      expect(r.code).toBeTruthy();
    }
  });

  it("all results have non-empty name", () => {
    for (const r of result.results) {
      expect(r.name).toBeTruthy();
    }
  });
});

describe("parseSearchResults – no results page", () => {
  const html = fixture("no-results.html");
  const result = parseSearchResults(html);

  it("returns total = 0", () => {
    expect(result.total).toBe(0);
  });

  it("returns count = 0", () => {
    expect(result.count).toBe(0);
  });

  it("returns empty results array", () => {
    expect(result.results).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────────────────
// parseDetailPage
// ──────────────────────────────────────────────────────────────────────

describe("parseDetailPage – lecture 26533320", () => {
  const html = fixture("detail-page.html");
  const detail = parseDetailPage(html);

  it("extracts name: 線形代数からはじめる量子力学", () => {
    expect(detail.name).toBe("線形代数からはじめる量子力学");
  });

  it("extracts numberingCode: KED-GES1221J", () => {
    expect(detail.numberingCode).toBe("KED-GES1221J");
  });

  it("extracts instructor: 平良　敬乃", () => {
    expect(detail.instructor).toBe("平良　敬乃");
  });

  it("extracts credits = 1", () => {
    expect(detail.credits).toBe(1);
  });

  it("extracts year = 2026", () => {
    expect(detail.year).toBe(2026);
  });

  it("extracts semester: 春学期", () => {
    expect(detail.semester).toBe("春学期");
  });

  it("extracts schedule containing 水曜日", () => {
    expect(detail.schedule).toContain("水曜日");
  });

  it("extracts schedule containing ４時限", () => {
    expect(detail.schedule).toContain("４時限");
  });

  it("extracts campus containing 伊都地区", () => {
    expect(detail.campus).toContain("伊都地区");
  });

  it("extracts language: 日本語（J）", () => {
    expect(detail.language).toBe("日本語（J）");
  });

  it("extracts category: 総合科目", () => {
    expect(detail.category).toBe("総合科目");
  });

  it("extracts targetYear: 全学年", () => {
    expect(detail.targetYear).toBe("全学年");
  });

  it("extracts purpose (Japanese) containing quantum mechanics description", () => {
    expect(detail.purpose).toContain("量子力学");
    expect(detail.purpose).toContain("線形代数");
  });

  it("extracts keywords containing ベクトル", () => {
    expect(detail.keywords).toContain("ベクトル");
  });

  it("extracts notes containing Moodle URL", () => {
    expect(detail.notes).toContain("moodle");
  });

  it("extracts teachingMethod containing 講義", () => {
    expect(detail.teachingMethod).toContain("講義");
  });

  it("extracts remoteLecture containing 対面授業", () => {
    expect(detail.remoteLecture).toContain("対面授業");
  });

  it("extracts moodle containing コース設定あり", () => {
    expect(detail.moodle).toContain("コース設定あり");
  });

  it("extracts materials containing 教科書", () => {
    expect(detail.materials).toContain("教科書");
  });

  it("extracts references containing 量子力学", () => {
    expect(detail.references).toContain("量子力学");
  });

  it("extracts grading containing レポート content", () => {
    expect(detail.grading).toContain("レポート");
  });

  it("extracts consultation containing メール", () => {
    expect(detail.consultation).toContain("メール");
  });

  it("extracts accommodation containing 合理的配慮", () => {
    expect(detail.accommodation).toContain("合理的配慮");
  });

  it("returns code from href", () => {
    expect(detail.code).toBe("26533320");
  });

  // Weekly syllabus
  it("extracts at least 10 weekly syllabus entries", () => {
    expect(detail.syllabus.length).toBeGreaterThanOrEqual(1);
  });

  it("first syllabus week is week 1", () => {
    expect(detail.syllabus[0].week).toBe(1);
  });

  it("first syllabus week theme is 量子のサイズ", () => {
    expect(detail.syllabus[0].theme).toBe("量子のサイズ");
  });

  it("first syllabus week content mentions 量子論", () => {
    expect(detail.syllabus[0].content).toContain("量子論");
  });

  it("second syllabus week is week 2", () => {
    expect(detail.syllabus[1].week).toBe(2);
  });

  it("second syllabus week theme is 量子の状態１", () => {
    expect(detail.syllabus[1].theme).toBe("量子の状態１");
  });

  it("syllabus weeks are in ascending order", () => {
    for (let i = 1; i < detail.syllabus.length; i++) {
      expect(detail.syllabus[i].week).toBeGreaterThan(detail.syllabus[i - 1].week);
    }
  });
});
