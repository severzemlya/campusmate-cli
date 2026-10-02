import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { normalise as clean } from "./parsers.js";
import type { FormFields } from "./session.js";
import type {
  Course,
  GradesResponse,
  GpaResponse,
  TimetableResponse,
  TimetableLecture,
  MessageListResponse,
  MessageDetail,
} from "./types.js";

const DAYS = ["月", "火", "水", "木", "金", "土"];

/** Normalize full-width alphanumerics (Ｓ → S, ２ → 2) */
function nfkc(text: string): string {
  return text.normalize("NFKC");
}

function toNumber(text: string): number | null {
  const n = Number(clean(text));
  return text.trim() === "" || Number.isNaN(n) ? null : n;
}

/** Text of an element with <br> turned into newlines */
function multilineText($: cheerio.CheerioAPI, el: cheerio.Cheerio<AnyNode>): string {
  const clone = el.clone();
  // Source newlines are just whitespace in HTML; only <br> breaks lines
  clone
    .find("*")
    .addBack()
    .contents()
    .each((_, node) => {
      if (node.type === "text") node.data = node.data.replace(/[\r\n]+/g, " ");
    });
  clone.find("br").replaceWith("\n");
  return clone
    .text()
    .split("\n")
    .map((l) => l.replace(/\u00a0/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// --- Session / form helpers ---

export function isLoggedIn(html: string): boolean {
  return html.includes("ログインユーザ");
}

export function isUnexpectedOperation(html: string): boolean {
  return html.includes("システムが期待しない操作");
}

export function isPasswordForm(html: string): boolean {
  return /name=["']j_password["']/.test(html);
}

export interface ParsedForm {
  action: string;
  fields: FormFields;
}

/** Parse a form (the first one, or the one with the given name) into action + fields */
export function parseForm(html: string, name?: string): ParsedForm | null {
  const $ = cheerio.load(html);
  const form = name ? $(`form[name="${name}"]`).first() : $("form").first();
  if (form.length === 0) return null;
  const fields: FormFields = [];
  form.find("input, textarea").each((_, el) => {
    const $el = $(el);
    const fieldName = $el.attr("name");
    const type = ($el.attr("type") ?? "text").toLowerCase();
    if (!fieldName || type === "checkbox" || type === "radio" || type === "button") return;
    fields.push([fieldName, $el.attr("value") ?? $el.text() ?? ""]);
  });
  return { action: form.attr("action") ?? "", fields };
}

export function extractTimestamp(html: string): string | null {
  const m = html.match(/name="timestamp" value="(\d+)"/);
  return m ? m[1] : null;
}

// --- Grades ---

export function parseGrades(html: string): GradesResponse {
  const $ = cheerio.load(html);
  const courses: Course[] = [];
  let category = "";
  let subcategory = "";

  $("table.list")
    .first()
    .find("tr")
    .each((_, tr) => {
      const cells = $(tr).children("td");
      if (cells.length === 1) {
        // Category header: indentation (nbsp) marks the sub level
        const cell = cells.first();
        const label = clean(cell.find("strong").text() || cell.text());
        if (cell.text().includes("\u00a0")) {
          subcategory = label;
        } else {
          category = label;
          subcategory = "";
        }
        return;
      }
      if (cells.length < 10) return;
      const t = cells.toArray().map((c) => clean($(c).text()));
      if (t[0] === "分野系列名／科目名") return;
      courses.push({
        category,
        subcategory,
        name: t[0],
        credits: toNumber(t[1]),
        grade: nfkc(t[2]),
        gp: toNumber(t[3]),
        year: toNumber(t[4]),
        term: t[5],
        numberingCode: t[6],
        code: t[7],
        instructor: t[8],
        updatedAt: t[9],
      });
    });

  return { count: courses.length, courses };
}

// --- GPA ---

export function parseGpa(html: string): GpaResponse {
  const $ = cheerio.load(html);
  const result: GpaResponse = {
    total: { credits: null, gpa: null },
    byType: [],
    byCategory: [],
    byTerm: [],
    byGradePoint: [],
    remoteCredits: [],
  };

  $("table.list").each((_, table) => {
    const rows = $(table)
      .find("tr")
      .toArray()
      .map((tr) =>
        $(tr)
          .children("td")
          .toArray()
          .map((c) => clean($(c).text())),
      )
      .filter((r) => r.some((c) => c !== ""));
    if (rows.length === 0) return;
    const header = rows[0].join("|");

    if (header.startsWith("科目の種類")) {
      let inDetail = false;
      for (const r of rows.slice(1)) {
        if (r[0].includes("以下詳細")) {
          inDetail = true;
          continue;
        }
        if (r.length < 3) continue;
        const entry = { name: r[0], credits: toNumber(r[1]), gpa: toNumber(r[2]) };
        if (/合計/.test(r[0])) {
          result.total = { credits: entry.credits, gpa: entry.gpa };
        } else if (inDetail) {
          // Category and subcategory rows repeat the same name; keep the first
          if (!result.byCategory.some((c) => c.name === entry.name)) result.byCategory.push(entry);
        } else {
          result.byType.push(entry);
        }
      }
    } else if (header.startsWith("GPA係数")) {
      for (const r of rows.slice(1)) {
        if (r.length < 3) continue;
        if (r[0] === "合計") continue;
        result.byGradePoint.push({ gradePoint: toNumber(r[0]), credits: toNumber(r[1]), gpt: toNumber(r[2]) });
      }
    } else if (header.startsWith("年度")) {
      for (const r of rows.slice(1)) {
        const m = r[0].match(/(\d{4})年\s*(\S+)/);
        if (!m) continue;
        result.byTerm.push({ year: Number(m[1]), term: m[2], gpa: toNumber(r[1]) });
      }
    } else if (header.startsWith("遠隔授業単位数")) {
      for (const r of rows.slice(1)) {
        if (r.length < 2) continue;
        result.remoteCredits.push({ name: r[0], credits: toNumber(r[1]) });
      }
    }
  });

  return result;
}

// --- Timetable ---

function lectureFromAnchor($: cheerio.CheerioAPI, a: cheerio.Cheerio<AnyNode>): TimetableLecture {
  const onclick = a.attr("onclick") ?? a.attr("onClick") ?? "";
  const code = onclick.match(/kougicd=(\d+)/)?.[1] ?? "";
  // Cell layout: <a>name</a><br>room<br>instructor<br>
  const lines = multilineText($, a.parent())
    .split("\n")
    .map((l) => clean(l));
  const name = clean(a.text());
  const rest = lines.slice(lines.indexOf(name) + 1).filter((l) => l !== "");
  const room = rest[0] === "_" ? "" : (rest[0] ?? "");
  const instructor = rest[1] ?? "";
  return { code, name, room, instructor };
}

export function parseTimetable(html: string): TimetableResponse {
  const $ = cheerio.load(html);
  const slots: TimetableResponse["slots"] = [];

  $("td.label_nodot").each((_, labelCell) => {
    const period = Number(clean($(labelCell).text()));
    if (!Number.isInteger(period) || period <= 0) return;
    const dayCells = $(labelCell).parent().children("td.item");
    dayCells.each((dayIndex, cell) => {
      const lectures = $(cell)
        .find('a[onclick*="kougicd="], a[onClick*="kougicd="]')
        .toArray()
        .map((a) => lectureFromAnchor($, $(a)));
      if (lectures.length === 0) return;
      slots.push({ day: DAYS[dayIndex] ?? String(dayIndex), period, lectures });
    });
  });

  const intensive: TimetableResponse["intensive"] = [];
  $("table.list").each((_, table) => {
    const header = clean($(table).find("tr.label").text());
    if (!header.includes("講義コード") || !header.includes("期間")) return;
    $(table)
      .find("tr")
      .not(".label")
      .each((_, tr) => {
        const t = $(tr)
          .children("td")
          .toArray()
          .map((c) => clean($(c).text()));
        if (t.length < 5 || !/^\d+$/.test(t[1])) return;
        intensive.push({
          term: t[0],
          code: t[1],
          name: t[2],
          instructor: t[3],
          room: t[4] === "_" ? "" : t[4],
        });
      });
  });

  // Term tabs: the selected one is <li class="active">, the other links via #kikannav
  const term = clean($("#kikannav").closest("ul").children("li.active").text());

  return { term, slots, intensive };
}

// --- Messages / notices ---

export function parseMessageList(html: string): MessageListResponse {
  const $ = cheerio.load(html);
  const header = clean($("#messglist").text()).match(/(\d+)-(\d+)件表示\/(\d+)件中/);
  const items: MessageListResponse["items"] = [];

  $('#messglist input[name="values(messgIds)"]').each((_, input) => {
    const tr = $(input).closest("tr");
    const cells = tr.children("td");
    const indexMatch = (cells.eq(1).find("a").attr("onclick") ?? "").match(/selectMsgr\((\d+)\)/);
    const readAt = clean(cells.eq(5).text());
    items.push({
      id: $(input).attr("value") ?? "",
      index: indexMatch ? Number(indexMatch[1]) : items.length,
      title: clean(cells.eq(1).text()),
      type: clean(cells.eq(2).text()),
      sender: clean(cells.eq(3).text()),
      receivedAt: clean(cells.eq(4).text()),
      readAt: readAt || null,
      unread: readAt === "",
    });
  });

  return {
    total: header ? Number(header[3]) : items.length,
    from: header ? Number(header[1]) : items.length ? 1 : 0,
    to: header ? Number(header[2]) : items.length,
    items,
  };
}

const DETAIL_LABELS: Record<string, keyof MessageDetail> = {
  送信者: "sender",
  メッセージ種別: "type",
  タイトル: "title",
  本文: "body",
};

export function parseMessageDetail(html: string): MessageDetail {
  const $ = cheerio.load(html);
  const detail: MessageDetail = { title: "", sender: "", type: "", body: "", fields: {}, links: [] };

  $("table.detail")
    .first()
    .find("tr")
    .each((_, tr) => {
      const label = clean($(tr).children("td.label").text());
      const item = $(tr).children("td.item");
      if (!label || item.length === 0) return;
      const value = label === "本文" ? multilineText($, item) : clean(item.text());
      const key = DETAIL_LABELS[label];
      if (key && key !== "fields" && key !== "links") {
        detail[key] = value;
      } else {
        detail.fields[label] = value;
      }
      item.find("a[href]").each((_, a) => {
        const href = $(a).attr("href") ?? "";
        if (href && !href.startsWith("javascript") && href !== "#") detail.links.push(href);
      });
    });

  return detail;
}
