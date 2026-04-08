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
        "Accept-Encoding": "identity",
      },
    });
  }

  private async initSession(path: string): Promise<string> {
    // GET the search page to obtain session cookie and timestamp
    const res = await this.http.get(path, {
      params: { clearAccessData: "true" },
    });
    const setCookies = res.headers["set-cookie"];
    if (setCookies) {
      this.cookies = setCookies.map((c: string) => c.split(";")[0]);
    }
    // Extract timestamp from HTML
    const match = res.data.match(/name="timestamp" value="(\d+)"/);
    return match ? match[1] : String(Date.now());
  }

  private getCookieHeader(): string {
    return this.cookies.join("; ");
  }

  private currentYear(): number {
    return new Date().getFullYear();
  }

  // Build form body as raw string to preserve literal parentheses
  private buildFormBody(fields: Record<string, string>): string {
    return Object.entries(fields)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
  }

  private async postSearch(path: string, body: string): Promise<string> {
    const res = await this.http.post(path, body, {
      headers: {
        Cookie: this.getCookieHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return res.data;
  }

  async searchLecture(opts: LectureSearchOptions): Promise<SearchResponse> {
    const timestamp = await this.initSession("slbsskgr.do");
    const year = String(opts.year ?? this.currentYear());
    const limit = opts.limit ?? 10;

    const body = this.buildFormBody({
      "value(methodname)": "sylkougi_search",
      "buttonName": "searchKougi",
      "timestamp": timestamp,
      "value(nendo)": year,
      "value(campuscd)": "",
      "value(kouginm)": opts.name ?? "",
      "value(syokunm)": opts.instructor ?? "",
      "value(kaikoCd)": opts.semester ?? "",
      "value(kamokuNumber)": "",
      "value(siyouGengo)": "",
      ...(opts.faculty ? { "values(multiKaikoSyozoku)": opts.faculty } : {}),
    });

    const html = await this.postSearch("slbsskgr.do", body);
    const firstPage = parseSearchResults(html);
    let allResults = [...firstPage.results];

    // Paginate if needed
    let page = 2;
    while (allResults.length < limit && allResults.length < firstPage.total) {
      const pageBody = this.buildFormBody({
        "navigateKougiList": "",
        "value(pageCount)": String(page),
        "value(maxCount)": "10",
        "timestamp": "",
      });
      const pageHtml = await this.postSearch("slbsskgr.do", pageBody);
      const pageResult = parseSearchResults(pageHtml);
      if (pageResult.results.length === 0) break;
      allResults.push(...pageResult.results);
      page++;
    }

    const trimmed = allResults.slice(0, limit);
    return { total: firstPage.total, count: trimmed.length, results: trimmed };
  }

  async searchInstructor(opts: InstructorSearchOptions): Promise<SearchResponse> {
    const timestamp = await this.initSession("slbsskyr.do");
    const year = String(opts.year ?? this.currentYear());
    const limit = opts.limit ?? 10;

    const body = this.buildFormBody({
      "buttonName": "searchKyoin",
      "timestamp": timestamp,
      "value(nendo)": year,
      "value(syonamk)": opts.name,
      "value(syozkcd)": opts.department ?? "",
    });

    const html = await this.postSearch("slbsskyr.do", body);
    const firstPage = parseSearchResults(html);
    let allResults = [...firstPage.results];

    let page = 2;
    while (allResults.length < limit && allResults.length < firstPage.total) {
      const pageBody = this.buildFormBody({
        "navigateKougiList": "",
        "value(pageCount)": String(page),
        "value(maxCount)": "10",
        "timestamp": "",
      });
      const pageHtml = await this.postSearch("slbsskyr.do", pageBody);
      const pageResult = parseSearchResults(pageHtml);
      if (pageResult.results.length === 0) break;
      allResults.push(...pageResult.results);
      page++;
    }

    const trimmed = allResults.slice(0, limit);
    return { total: firstPage.total, count: trimmed.length, results: trimmed };
  }

  async searchFulltext(opts: FulltextSearchOptions): Promise<SearchResponse> {
    const timestamp = await this.initSession("slbsskwr.do");
    const year = String(opts.year ?? this.currentYear());
    const limit = opts.limit ?? 10;

    const body = this.buildFormBody({
      "buttonName": "searchWord",
      "timestamp": timestamp,
      "value(nendo)": year,
      "value(keywords)": opts.keyword,
      "value(searchKeywordFlg)": opts.match === "any" ? "2" : "1",
    });

    const html = await this.postSearch("slbsskwr.do", body);
    const firstPage = parseSearchResults(html);
    let allResults = [...firstPage.results];

    let page = 2;
    while (allResults.length < limit && allResults.length < firstPage.total) {
      const pageBody = this.buildFormBody({
        "navigateKougiList": "",
        "value(pageCount)": String(page),
        "value(maxCount)": "10",
        "timestamp": "",
      });
      const pageHtml = await this.postSearch("slbsskwr.do", pageBody);
      const pageResult = parseSearchResults(pageHtml);
      if (pageResult.results.length === 0) break;
      allResults.push(...pageResult.results);
      page++;
    }

    const trimmed = allResults.slice(0, limit);
    return { total: firstPage.total, count: trimmed.length, results: trimmed };
  }

  async getDetail(code: string, year?: number): Promise<SyllabusDetail> {
    const y = year ?? this.currentYear();
    const url = `slbssbdr.do?value(risyunen)=${y}&value(semekikn)=1&value(kougicd)=${code}&value(crclumcd)=ZZ`;
    const res = await this.http.get(url, {
      headers: { "Accept-Encoding": "identity" },
    });
    const detail = parseDetailPage(res.data);
    if (!detail.code) detail.code = code;
    return detail;
  }
}
