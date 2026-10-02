import { describe, it, expect } from "vitest";
import { filenameFromDisposition, encodeForm } from "../src/session.js";

describe("filenameFromDisposition", () => {
  it("re-decodes raw UTF-8 bytes exposed as latin1", () => {
    const raw = Buffer.from("1_履修の手引き（通知）.pdf", "utf8").toString("latin1");
    expect(filenameFromDisposition(`attachment; filename="${raw}"`)).toBe("1_履修の手引き（通知）.pdf");
  });

  it("keeps ASCII names as-is", () => {
    expect(filenameFromDisposition('attachment; filename="2_Notice_FY2026.pdf"')).toBe("2_Notice_FY2026.pdf");
  });

  it("keeps genuine latin1 names that are not valid UTF-8", () => {
    expect(filenameFromDisposition('attachment; filename="café.pdf"')).toBe("café.pdf");
  });

  it("prefers RFC 5987 filename*", () => {
    expect(
      filenameFromDisposition("attachment; filename=\"x.pdf\"; filename*=UTF-8''%E6%89%8B%E5%BC%95%E3%81%8D.pdf"),
    ).toBe("手引き.pdf");
  });

  it("returns null without a filename", () => {
    expect(filenameFromDisposition("inline")).toBeNull();
    expect(filenameFromDisposition("")).toBeNull();
  });
});

describe("encodeForm", () => {
  it("keeps parentheses in field names and encodes values", () => {
    expect(encodeForm([["value(pageCount)", "2"], ["q", "線形 代数"]])).toBe(
      "value(pageCount)=2&q=%E7%B7%9A%E5%BD%A2%20%E4%BB%A3%E6%95%B0",
    );
  });
});
