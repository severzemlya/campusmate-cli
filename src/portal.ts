import { ssoLogin, resolveCredentials, type Credentials } from "./auth.js";
import { HttpSession, type PageResponse } from "./session.js";
import {
  isLoggedIn,
  isUnexpectedOperation,
  parseForm,
  extractTimestamp,
  parseGrades,
  parseGpa,
  parseTimetable,
  parseMessageList,
  parseMessageDetail,
} from "./portal-parsers.js";
import type {
  GradesResponse,
  GpaResponse,
  TimetableResponse,
  MessageKind,
  MessageListResponse,
  MessageDetail,
} from "./types.js";

/** Pause between consecutive page requests to keep load on the portal low */
const REQUEST_INTERVAL_MS = 500;
const PAGE_SIZES = [5, 10, 20, 50, 100];

const MESSAGE_ENTRY: Record<MessageKind, string> = {
  messages: "wbasmgjr.do?clearAccessData=true&kjnmnNo=3",
  univ: "wbasoapr.do?contenam=wbasoapr&buttonName=showListFromOshrsPortlet",
  job: "wsyuoapr.do?contenam=wsyuoapr&buttonName=showListFromSyusyPortlet",
};

const GRADES_PATH = "wssrlstr.do?clearAccessData=true&contenam=wssrlstr&kjnmnNo=128";
const TIMETABLE_PATH = "prtlmjkr.do?clearAccessData=true&kjnmnNo=112";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Client for pages behind the Campusmate login.
 * Read-only: never submits registration or settings forms.
 */
export class PortalClient {
  private lastRequest = 0;

  constructor(
    private session: HttpSession,
    private getCredentials: () => Promise<Credentials | null> = resolveCredentials,
  ) {}

  static async open(): Promise<PortalClient> {
    return new PortalClient(await HttpSession.load());
  }

  async login(): Promise<void> {
    await this.throttle();
    await ssoLogin(this.session, this.getCredentials);
  }

  async logout(): Promise<void> {
    try {
      await this.session.post("logout.do", []);
    } catch {
      // Best effort: the local session is removed regardless
    }
    await this.session.clear();
  }

  /** Whether the saved session is still accepted by Campusmate (no re-login) */
  async isSessionValid(): Promise<boolean> {
    const page = await this.request(() => this.session.get("top.do"));
    return isLoggedIn(page.html);
  }

  async grades(): Promise<GradesResponse> {
    const page = await this.page(GRADES_PATH);
    return parseGrades(page.html);
  }

  async gpa(): Promise<GpaResponse> {
    const page = await this.page(GRADES_PATH);
    const form = parseForm(page.html, "kyomuActionForm");
    if (!form) throw new Error("成績照会ページの形式が想定と異なります");
    const fields = form.fields.filter(([k]) => k !== "buttonName");
    fields.push(["buttonName", "showGpaResult"]);
    const result = await this.post(form.action, fields);
    return parseGpa(result.html);
  }

  /** term: 1 = 前期, 2 = 後期. Omit to use the portal's default (current) term. */
  async timetable(term?: 1 | 2): Promise<TimetableResponse> {
    let page = await this.page(TIMETABLE_PATH);
    if (term) {
      page = await this.request(() =>
        this.session.get(`prtlmjkr.do?buttonName=switchJikanwariKikan&kikankn=${term}`),
      );
      this.assertPage(page);
    }
    return parseTimetable(page.html);
  }

  async messages(kind: MessageKind, opts: { limit?: number; page?: number } = {}): Promise<MessageListResponse> {
    const limit = opts.limit ?? 10;
    const pageNo = opts.page ?? 1;
    const pageSize = PAGE_SIZES.find((s) => s >= limit) ?? PAGE_SIZES[PAGE_SIZES.length - 1];

    let page = await this.page(MESSAGE_ENTRY[kind]);
    if (pageSize !== 5 || pageNo !== 1) {
      page = await this.changeListPage(page, pageNo, pageSize);
    }
    const list = parseMessageList(page.html);
    return { ...list, items: list.items.slice(0, limit) };
  }

  /**
   * Open a message by ID. Opening a message marks it as read on the portal.
   * Searches up to `maxPages` pages of 100 items.
   */
  async message(kind: MessageKind, id: string, maxPages = 3): Promise<MessageDetail & { id: string }> {
    let page = await this.page(MESSAGE_ENTRY[kind]);
    for (let p = 1; p <= maxPages; p++) {
      page = await this.changeListPage(page, p, 100);
      const list = parseMessageList(page.html);
      const item = list.items.find((i) => i.id === id);
      if (item) {
        const detail = await this.post("wbasmgjr.do", [
          ["buttonName", "selectDetail"],
          ["timestamp", extractTimestamp(page.html) ?? ""],
          ["value(selectDetailIndex)", String(item.index)],
        ]);
        return { id, ...parseMessageDetail(detail.html) };
      }
      if (list.to >= list.total) break;
    }
    throw new Error(`ID ${id} のメッセージが見つかりませんでした (直近 ${maxPages * 100} 件を検索)`);
  }

  private async changeListPage(current: PageResponse, pageNo: number, pageSize: number): Promise<PageResponse> {
    return this.post("wbasmgjr.do", [
      ["buttonName", "changeStateList"],
      ["timestamp", extractTimestamp(current.html) ?? ""],
      ["value(pageCount)", String(pageNo)],
      ["value(maxCount)", String(pageSize)],
    ]);
  }

  /** GET a page, logging in again once if the session has expired */
  private async page(path: string): Promise<PageResponse> {
    let page = await this.request(() => this.session.get(path));
    if (!isLoggedIn(page.html)) {
      await this.login();
      page = await this.request(() => this.session.get(path));
    }
    this.assertPage(page);
    return page;
  }

  private async post(path: string, fields: [string, string][]): Promise<PageResponse> {
    const page = await this.request(() => this.session.post(path, fields));
    this.assertPage(page);
    return page;
  }

  private assertPage(page: PageResponse): void {
    if (isUnexpectedOperation(page.html)) {
      throw new Error("Campusmate が操作を受け付けませんでした (画面遷移の順序エラー)。もう一度実行してください。");
    }
    if (!isLoggedIn(page.html)) {
      throw new Error("ログイン状態のページを取得できませんでした");
    }
  }

  private async request(fn: () => Promise<PageResponse>): Promise<PageResponse> {
    await this.throttle();
    const res = await fn();
    await this.session.save();
    return res;
  }

  private async throttle(): Promise<void> {
    const wait = this.lastRequest + REQUEST_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    this.lastRequest = Date.now();
  }
}
