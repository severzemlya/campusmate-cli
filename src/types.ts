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
