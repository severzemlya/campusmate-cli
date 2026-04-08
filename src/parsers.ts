import { load } from "cheerio";
import type { CheerioAPI } from "cheerio";
import type {
  SearchResponse,
  SearchResultItem,
  SyllabusDetail,
  SyllabusWeek,
} from "./types.js";

/**
 * Normalise whitespace: replace &nbsp; (U+00A0) with a plain space, then
 * collapse runs of ASCII whitespace (space, tab, newline, CR) to a single
 * space, and trim.
 *
 * Full-width ideographic spaces (U+3000) are intentionally preserved because
 * they are meaningful in Japanese names and schedule strings.
 */
function normalise(text: string): string {
  return text
    .replace(/\u00a0/g, " ")   // &nbsp; → regular space
    .replace(/\.none_display\s*\{[^}]*\}\s*/g, "") // strip CSS artifacts
    .replace(/[ \t\r\n]+/g, " ") // collapse ASCII whitespace runs
    .trim();
}

/**
 * Extract the text content of a `<td class="kougi">` (or the matching
 * value cell for orange-background labels) that immediately follows a
 * `<td class="label_kougi">` whose text matches `labelText`.
 *
 * For the orange-background variant the label `td` has an inline style
 * instead of the `label_kougi` class; both variants are handled here.
 */
function extractFieldByLabel(
  $: CheerioAPI,
  labelText: string
): string {
  let value = "";

  // 1. Standard label_kougi → sibling kougi pattern
  $("td.label_kougi").each((_i, el) => {
    if (normalise($(el).text()) === labelText) {
      // The value td is the next td sibling (possibly separated by
      // td.line_y_label in between).
      const row = $(el).closest("tr");
      const valueTd = row.find("td.kougi").first();
      if (valueTd.length) {
        value = normalise(valueTd.text());
        return false; // break
      }
    }
  });

  if (value) return value;

  // 2. Orange-background label (inline style background:#FFF1E9) → next td
  $("td[style*='FFF1E9'], td[style*='fff1e9']").each((_i, el) => {
    if (normalise($(el).text()) === labelText) {
      const row = $(el).closest("tr");
      // Use direct children only to avoid descending into nested tables
      const directTds = row.children("td");
      // Row layout: [label td] [divider td.line_y_label] [value td]
      const valueTd = directTds.filter(
        (_j, td) => !$(td).hasClass("line_y_label") && td !== el
      ).last();
      if (valueTd.length) {
        value = normalise(valueTd.text());
        return false; // break
      }
    }
  });

  return value;
}

/**
 * Parse a Campusmate-J search results page.
 */
export function parseSearchResults(html: string): SearchResponse {
  const $ = load(html);

  // ── total / count ────────────────────────────────────────────────────
  let total = 0;
  let count = 0;

  // Look for text like "1-10件表示/38件中"
  const countText = $("span")
    .map((_i, el) => normalise($(el).text()))
    .get()
    .find((t) => /\d+件中/.test(t));

  if (countText) {
    // "1-10件表示/38件中"
    const totalMatch = countText.match(/(\d+)件中/);
    if (totalMatch) total = parseInt(totalMatch[1], 10);

    const rangeMatch = countText.match(/(\d+)-(\d+)件表示/);
    if (rangeMatch) {
      count = parseInt(rangeMatch[2], 10) - parseInt(rangeMatch[1], 10) + 1;
    }
  }

  // Handle "0件" case (no results page uses a different format)
  if (total === 0 && count === 0) {
    const zeroText = $("font[color='red'], font[color='Red']").text();
    if (/0件/.test(zeroText)) {
      return { total: 0, count: 0, results: [] };
    }
  }

  // ── result rows ──────────────────────────────────────────────────────
  const results: SearchResultItem[] = [];

  $("tr.column_odd, tr.column_even").each((_i, row) => {
    const tds = $(row).find("td");

    // td[0] = No (center), td[1] = code (center), td[2] = name (link),
    // td[3] = schedule, td[4] = instructor
    if (tds.length < 5) return;

    const code = normalise($(tds[1]).text());
    const name = normalise($(tds[2]).text());

    // Extract lecture code from the href as a fallback / cross-check
    const href = $(tds[2]).find("a").attr("href") ?? "";
    const hrefCode = href.match(/kougicd=(\d+)/)?.[1] ?? "";

    const schedule = normalise($(tds[3]).text());
    const instructor = normalise($(tds[4]).text());

    // Separate semester from schedule: the cell contains text like
    // "春学期　水曜日　４時限" (all joined with full-width spaces which
    // we've already normalised to ASCII spaces above).
    // The semester is typically "春学期" or "前期" etc. (everything before
    // the first 曜日 fragment). We keep it simple and expose the full text.
    results.push({
      code: code || hrefCode,
      name,
      semester: schedule, // raw combined text; callers may split further
      schedule,
      instructor,
    });
  });

  return { total, count, results };
}

/**
 * Parse instructor search results page.
 * Returns an array of URLs to follow for each instructor's lecture list.
 */
export function parseInstructorResults(html: string): string[] {
  const $ = load(html);
  const urls: string[] = [];

  $("input#searchKougiURL, input[id='searchKougiURL']").each((_, el) => {
    const onclick = $(el).attr("onclick") ?? "";
    const match = onclick.match(/location\.href='([^']+)'/);
    if (match) urls.push(match[1]);
  });

  return urls;
}

/**
 * Parse a Campusmate-J syllabus detail page.
 */
export function parseDetailPage(html: string): SyllabusDetail {
  const $ = load(html);

  // Helper: try to get the code from the page URL embedded in forms/links
  // (not strictly needed – the caller usually knows it).
  const codeFromLink =
    $("a[href*='kougicd=']")
      .first()
      .attr("href")
      ?.match(/kougicd=(\d+)/)?.[1]
    ?? $("#kougicd").val()?.toString()
    ?? "";

  // ── standard label_kougi fields ─────────────────────────────────────
  const name = extractFieldByLabel($, "科目名称");
  const numberingCode = extractFieldByLabel($, "科目ナンバリング・コード");
  const category = extractFieldByLabel($, "授業科目区分");
  const language = extractFieldByLabel($, "使用言語");
  const targetYear = extractFieldByLabel($, "対象学年");
  const creditsRaw = extractFieldByLabel($, "単位数");
  const yearRaw = extractFieldByLabel($, "開講年度");
  const semester = extractFieldByLabel($, "開講学期");
  const campus = extractFieldByLabel($, "開講地区");

  // 曜日時限 has a <br> inside – the normalise helper collapses it
  const schedule = extractFieldByLabel($, "曜日時限");

  // ── instructor (inside nested table) ────────────────────────────────
  const instructor = extractFieldByLabel($, "担当教員");

  // ── orange-background / rich-text fields ────────────────────────────
  const topic = extractFieldByLabel($, "講義題目");
  const notes = extractFieldByLabel($, "授業科目に関する特筆事項");
  const purpose = extractFieldByLabel($, "授業科目の目的（日本語）");
  const purposeEn = extractFieldByLabel($, "授業科目の目的（英語）");
  const keywords = extractFieldByLabel($, "キーワード");
  const teachingMethod = extractFieldByLabel($, "授業の方法");
  const remoteLecture = extractFieldByLabel($, "遠隔授業");
  const moodle = extractFieldByLabel($, "Moodleコース情報");
  const materials = extractFieldByLabel($, "使用する教材");
  const textbook = extractFieldByLabel($, "テキスト");
  const references = extractFieldByLabel($, "参考書等");
  const consultation = extractFieldByLabel($, "担当教員による学習相談");
  const accommodation = extractFieldByLabel($, "合理的配慮について");

  // ── grading: collect text under "成績評価" section ──────────────────
  // The grading section has multiple sub-fields (レポート, 授業への貢献度, …).
  // We collect them all under a single string.
  const gradingParts: string[] = [];
  const gradingSectionLabels = ["レポート", "授業への貢献度", "試験", "小テスト", "平常点"];
  for (const lbl of gradingSectionLabels) {
    const v = extractFieldByLabel($, lbl);
    if (v) gradingParts.push(`${lbl}: ${v}`);
  }
  const grading = gradingParts.join("\n");

  // ── weekly syllabus ──────────────────────────────────────────────────
  // The weekly table is found after the "授業計画" header row.
  // Structure: each data row has:
  //   cell 0 : week number (background #fff1e9, center aligned)
  //   cell 1 : theme (padding, transparent background)
  //   cell 2 : content (padding, transparent background)
  //   cell 3 : pre/post study note (optional)
  const syllabus: SyllabusWeek[] = [];

  // Find the <tr> that contains the "授業計画" label
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let syllabusTableEl: any;
  $("tr").each((_i, tr) => {
    const firstTd = $(tr).find("td").first();
    if (normalise(firstTd.text()) === "授業計画") {
      // The weekly table is a sibling <tr> that wraps the schedule table
      const parent = $(tr).parent();
      parent.find("table[style*='border-collapse']").each((_j, tbl) => {
        syllabusTableEl = tbl;
        return false;
      });
      return false;
    }
  });

  if (syllabusTableEl) {
    $(syllabusTableEl)
      .find("tr")
      .each((_i, row) => {
        const cells = $(row).find("td");
        if (cells.length < 3) return;

        const weekText = normalise($(cells[0]).text());
        const weekNum = parseInt(weekText, 10);
        if (isNaN(weekNum)) return; // header rows, dividers, etc.

        const theme = normalise($(cells[1]).text());
        const content = normalise($(cells[2]).text());

        syllabus.push({ week: weekNum, theme, content });
      });
  }

  return {
    code: codeFromLink,
    name,
    topic,
    numberingCode,
    instructor,
    credits: parseInt(creditsRaw, 10) || 0,
    year: parseInt(yearRaw, 10) || 0,
    semester,
    schedule,
    campus,
    language,
    category,
    targetYear,
    purpose,
    purposeEn,
    keywords,
    notes,
    teachingMethod,
    remoteLecture,
    moodle,
    materials,
    textbook,
    references,
    grading,
    syllabus,
    consultation,
    accommodation,
  };
}
