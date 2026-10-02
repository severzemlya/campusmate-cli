import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isLoggedIn,
  isPasswordForm,
  isUnexpectedOperation,
  parseForm,
  extractTimestamp,
  parseGrades,
  parseGpa,
  parseTimetable,
  parseMessageList,
  parseMessageDetail,
} from "../src/portal-parsers.js";

const fixture = (name: string) =>
  readFileSync(join(__dirname, "fixtures", "portal", name), "utf-8");

describe("session helpers", () => {
  it("detects logged-in pages", () => {
    expect(isLoggedIn(fixture("grades.html"))).toBe(true);
    expect(isLoggedIn(fixture("idp-password-form.html"))).toBe(false);
  });

  it("detects the IdP password form", () => {
    expect(isPasswordForm(fixture("idp-password-form.html"))).toBe(true);
    expect(isPasswordForm(fixture("saml-response.html"))).toBe(false);
  });

  it("detects the unexpected-operation error page", () => {
    expect(isUnexpectedOperation("<p>ユーザによってシステムが期待しない操作が行われました。</p>")).toBe(true);
    expect(isUnexpectedOperation(fixture("grades.html"))).toBe(false);
  });

  it("extracts the form timestamp", () => {
    expect(extractTimestamp(fixture("message-list.html"))).toBe("1700000000002");
    expect(extractTimestamp("<html></html>")).toBeNull();
  });
});

describe("parseForm", () => {
  it("parses the IdP login form, skipping checkboxes", () => {
    const form = parseForm(fixture("idp-password-form.html"));
    expect(form?.action).toBe("/idp/profile/SAML2/Redirect/SSO?execution=e1s2");
    expect(form?.fields).toEqual([
      ["csrf_token", "_0123456789abcdef0123456789abcdef01234567"],
      ["j_username", ""],
      ["j_password", ""],
      ["_eventId_proceed", "Login"],
    ]);
  });

  it("decodes entity-encoded action and values in the SAML response form", () => {
    const form = parseForm(fixture("saml-response.html"));
    expect(form?.action).toBe("https://ku-portal.kyushu-u.ac.jp/eduapi/gknsso/Shibboleth.sso/SAML2/POST");
    expect(form?.fields).toEqual([
      ["RelayState", "ss:mem:abc123"],
      ["SAMLResponse", "PHNhbWxwOlJlc3BvbnNlPg=="],
    ]);
  });

  it("selects a form by name", () => {
    const form = parseForm(fixture("grades.html"), "kyomuActionForm");
    expect(form?.action).toBe("/campusweb/wssrlstr.do");
    expect(form?.fields.map(([k]) => k)).toEqual(["buttonName", "timestamp", "contenam"]);
  });

  it("returns null when there is no form", () => {
    expect(parseForm("<html><body></body></html>")).toBeNull();
  });
});

describe("parseGrades", () => {
  const result = parseGrades(fixture("grades.html"));

  it("parses every course row", () => {
    expect(result.count).toBe(3);
    expect(result.courses.map((c) => c.name)).toEqual(["基幹教育セミナー", "アイデア創出入門", "材料力学Ⅰ"]);
  });

  it("tracks category and indented subcategory headers", () => {
    expect(result.courses[1].category).toBe("総合科目");
    expect(result.courses[1].subcategory).toBe("フロンティア科目");
    // A new top-level category resets the subcategory
    expect(result.courses[2].category).toBe("（工）専攻教育科目");
    expect(result.courses[2].subcategory).toBe("");
  });

  it("normalizes grades and numbers", () => {
    expect(result.courses[2]).toEqual({
      category: "（工）専攻教育科目",
      subcategory: "",
      name: "材料力学Ⅰ",
      credits: 2,
      grade: "S",
      gp: 4,
      year: 2026,
      term: "前",
      numberingCode: "ENG-MEC2001J",
      code: "26200003",
      instructor: "六本松　三郎",
      updatedAt: "2026/08/30",
    });
  });

  it("uses null GP for courses outside GPA (*)", () => {
    expect(result.courses[0].grade).toBe("R");
    expect(result.courses[0].gp).toBeNull();
  });
});

describe("parseGpa", () => {
  const result = parseGpa(fixture("gpa.html"));

  it("parses the total despite unclosed cells", () => {
    expect(result.total).toEqual({ credits: 60, gpa: 2.67 });
  });

  it("separates the summary rows from the detail rows", () => {
    expect(result.byType).toEqual([
      { name: "基幹教育科目", credits: 40, gpa: 2.5 },
      { name: "専攻教育科目", credits: 20, gpa: 3 },
    ]);
    // Duplicate category/subcategory rows are merged
    expect(result.byCategory).toEqual([
      { name: "言語文化科目", credits: 6, gpa: 2 },
      { name: "総合科目", credits: 4, gpa: 3.5 },
    ]);
  });

  it("parses grade point distribution without the total rows", () => {
    expect(result.byGradePoint).toEqual([
      { gradePoint: 4, credits: 10, gpt: 40 },
      { gradePoint: 3, credits: 20, gpt: 60 },
    ]);
  });

  it("parses GPA per term", () => {
    expect(result.byTerm).toEqual([
      { year: 2025, term: "前期", gpa: 2.85 },
      { year: 2026, term: "後期", gpa: 0 },
    ]);
  });

  it("parses remote class credits", () => {
    expect(result.remoteCredits).toEqual([
      { name: "基幹教育科目", credits: 2 },
      { name: "合計", credits: 2 },
    ]);
  });
});

describe("parseTimetable", () => {
  const result = parseTimetable(fixture("timetable.html"));

  it("reads the selected term from the active tab", () => {
    expect(result.term).toBe("前期");
  });

  it("maps day columns and periods", () => {
    expect(result.slots.map((s) => [s.day, s.period])).toEqual([
      ["月", 1],
      ["火", 1],
      ["金", 2],
    ]);
  });

  it("extracts code, room and instructor of each lecture", () => {
    expect(result.slots[0].lectures).toEqual([
      { code: "26200003", name: "材料力学Ⅰ（S2-20）", room: "W2-531", instructor: "六本松　三郎" },
    ]);
  });

  it("keeps multiple lectures in one slot and blanks the '_' room placeholder", () => {
    expect(result.slots[1].lectures).toEqual([
      { code: "26500011", name: "科学の歴史Ａ", room: "", instructor: "伊都　花子" },
      { code: "26500012", name: "科学の歴史Ｂ", room: "", instructor: "伊都　花子" },
    ]);
  });

  it("parses intensive courses", () => {
    expect(result.intensive).toEqual([
      { term: "前期集中", code: "26500020", name: "学術英語・CALL１", instructor: "大橋　四郎", room: "" },
    ]);
  });
});

describe("parseMessageList", () => {
  const result = parseMessageList(fixture("message-list.html"));

  it("parses the paging header", () => {
    expect(result).toMatchObject({ total: 1058, from: 1, to: 2 });
  });

  it("parses each row with id, index and read state", () => {
    expect(result.items).toEqual([
      {
        id: "2300001",
        index: 0,
        title: "[重要] 【基幹教育】後期履修登録期間が開始します",
        type: "教務関係",
        sender: "（基幹）基幹教育教務係",
        receivedAt: "2026/10/02 09:10",
        readAt: null,
        unread: true,
      },
      {
        id: "2300000",
        index: 1,
        title: "工事のお知らせ",
        type: "お知らせ（その他）",
        sender: "事務局",
        receivedAt: "2026/10/01 17:50",
        readAt: "2026/10/02 08:00",
        unread: false,
      },
    ]);
  });
});

describe("parseMessageDetail", () => {
  const result = parseMessageDetail(fixture("message-detail.html"));

  it("maps the known labels", () => {
    expect(result.sender).toBe("（基幹）基幹教育教務係");
    expect(result.type).toBe("教務関係");
    expect(result.title).toBe("[重要] 【基幹教育】後期履修登録期間が開始します");
  });

  it("keeps line breaks in the body and squeezes blank lines", () => {
    expect(result.body).toBe(
      "後期の履修登録期間は以下のとおりです。\n・期間：10月2日～10月9日\n\n詳細は こちら を参照してください。",
    );
  });

  it("collects other rows and links", () => {
    expect(result.fields).toEqual({ 掲示期間: "2026/10/02 ～ 2026/10/09" });
    expect(result.links).toEqual(["https://example.kyushu-u.ac.jp/notice"]);
  });

  it("collects attachments with their session file IDs", () => {
    expect(result.attachments).toEqual([
      { name: "履修登録の手引き（令和８年度後期", fileId: "1234567890" },
      { name: "Guide (EN)", fileId: "-987654321" },
    ]);
  });
});
