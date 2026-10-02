export interface SearchResultItem {
  code: string;
  name: string;
  semester: string;
  schedule: string;
  instructor: string;
  /** Raw detail page URL path extracted from the search result link */
  detailUrl?: string;
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

// --- Authenticated portal ---

export interface Course {
  /** 分野系列 (top-level category) */
  category: string;
  /** Sub category, empty when the course sits directly under the category */
  subcategory: string;
  name: string;
  credits: number | null;
  /** S/A/B/C/D/F/R etc. (normalized to half-width) */
  grade: string;
  /** Grade point, null when not counted in GPA ("*") */
  gp: number | null;
  year: number | null;
  term: string;
  numberingCode: string;
  code: string;
  instructor: string;
  updatedAt: string;
}

export interface GradesResponse {
  count: number;
  courses: Course[];
}

export interface GpaEntry {
  name: string;
  credits: number | null;
  gpa: number | null;
}

export interface GpaResponse {
  total: { credits: number | null; gpa: number | null };
  /** 基幹教育科目 / 専攻教育科目 */
  byType: GpaEntry[];
  byCategory: GpaEntry[];
  byTerm: { year: number; term: string; gpa: number | null }[];
  byGradePoint: { gradePoint: number | null; credits: number | null; gpt: number | null }[];
  remoteCredits: { name: string; credits: number | null }[];
}

export interface TimetableLecture {
  code: string;
  name: string;
  room: string;
  instructor: string;
}

export interface TimetableResponse {
  /** Displayed term (前期 / 後期) */
  term: string;
  slots: { day: string; period: number; lectures: TimetableLecture[] }[];
  intensive: (TimetableLecture & { term: string })[];
}

export type MessageKind = "messages" | "univ" | "job";

export interface MessageListItem {
  id: string;
  /** Row index within the current page (used to open the detail) */
  index: number;
  title: string;
  type: string;
  sender: string;
  receivedAt: string;
  readAt: string | null;
  unread: boolean;
}

export interface MessageListResponse {
  total: number;
  from: number;
  to: number;
  items: MessageListItem[];
}

export interface MessageDetail {
  title: string;
  sender: string;
  type: string;
  body: string;
  /** Other label/value rows on the detail page */
  fields: Record<string, string>;
  links: string[];
  attachments: MessageAttachment[];
}

export interface MessageAttachment {
  /** Link text on the portal (may be truncated) */
  name: string;
  /** Session-scoped file ID: only valid right after the message is opened */
  fileId: string;
  /** Set when the file was downloaded */
  filename?: string;
  path?: string;
  size?: number;
}
