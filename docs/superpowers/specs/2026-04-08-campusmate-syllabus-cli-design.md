# Campusmate Syllabus CLI - Design Document

## Overview

九州大学 Campusmate-J のシラバス検索システムに対して、CLIからHTTPリクエストで検索・詳細取得を行うツール。Claude Code スキルとして登録し、会話の中から自然にシラバス検索ができるようにする。

## Target System

- Base URL: `https://ku-portal.kyushu-u.ac.jp/campusweb/`
- Authentication: 不要（シラバス検索は公開機能）
- Form-based POST/GET interaction with session cookies

## CLI Interface

### Commands

#### `search-lecture` - 講義から検索

POST先: `slbsskgr.do`

| Option | Description | Required | Form Field |
|---|---|---|---|
| `--name` | 講義名称 | No | `value(kouginm)` |
| `--instructor` | 担当教員 | No | `value(syokunm)` |
| `--faculty` | 開講学部・学府コード | No | `values(multiKaikoSyozoku)` |
| `--semester` | 開講時期 | No | `value(kaikoCd)` |
| `--year` | 年度 (default: current) | No | `value(nendo)` |
| `--limit` | 取得件数 (default: 10, max: 100) | No | N/A (pagination) |

Hidden fields:
- `value(methodname)` = `sylkougi_search`
- `buttonName` = (empty)
- `timestamp` = current timestamp

#### `search-instructor` - 教員から検索

POST先: `slbsskyr.do`

| Option | Description | Required | Form Field |
|---|---|---|---|
| `--name` | 教員氏名 | Yes | `value(syonamk)` |
| `--department` | 教員所属コード | No | `value(syozkcd)` |
| `--year` | 年度 | No | `value(nendo)` |
| `--limit` | 取得件数 | No | N/A |

#### `search-fulltext` - 全文検索

POST先: `slbsskwr.do`

| Option | Description | Required | Form Field |
|---|---|---|---|
| `--keyword` | 検索キーワード | Yes | `value(keywords)` |
| `--match` | `all` or `any` (default: `all`) | No | `value(searchKeywordFlg)` (1=all, 2=any) |
| `--year` | 年度 | No | `value(nendo)` |
| `--limit` | 取得件数 | No | N/A |

#### `detail` - シラバス詳細取得

GET: `slbssbdr.do?value(risyunen)={year}&value(semekikn)=1&value(kougicd)={code}&value(crclumcd)=ZZ`

| Option | Description | Required |
|---|---|---|
| `--code` | 講義コード (e.g. `26533320`) | Yes |
| `--year` | 年度 | No |

## Architecture

```
campusmate-cli/
├── src/
│   ├── index.ts          # CLI entry point (commander.js)
│   ├── client.ts         # HTTP client, form POST, HTML parsing
│   ├── commands/
│   │   ├── search-lecture.ts
│   │   ├── search-instructor.ts
│   │   ├── search-fulltext.ts
│   │   └── detail.ts
│   └── types.ts          # Type definitions
├── package.json
└── tsconfig.json
```

### Dependencies

- **commander** - CLI argument parsing with subcommands
- **axios** - HTTP requests with cookie/session support
- **cheerio** - Lightweight HTML parsing (jQuery-like API)
- **typescript** - Type safety

## Output Format

### Search Results (all search-* commands)

```json
{
  "total": 38,
  "count": 10,
  "results": [
    {
      "code": "26533320",
      "name": "線形代数からはじめる量子力学",
      "semester": "春学期",
      "schedule": "水曜日 4時限",
      "instructor": "平良 敬乃"
    }
  ]
}
```

### Detail

```json
{
  "code": "26533320",
  "name": "線形代数からはじめる量子力学",
  "topic": "線形代数からはじめる量子力学",
  "numberingCode": "KED-GES1221J",
  "instructor": "平良 敬乃",
  "credits": 1,
  "year": 2026,
  "semester": "春学期",
  "schedule": "春学期 水曜日 4時限",
  "campus": "伊都地区",
  "language": "日本語（J）",
  "category": "総合科目",
  "targetYear": "全学年",
  "purpose": "...",
  "purposeEn": "...",
  "keywords": "...",
  "notes": "...",
  "teachingMethod": "...",
  "remoteLecture": "...",
  "moodle": "...",
  "materials": "...",
  "textbook": "...",
  "references": "...",
  "grading": "...",
  "syllabus": [
    { "week": 1, "theme": "量子のサイズ", "content": "..." }
  ],
  "consultation": "...",
  "accommodation": "..."
}
```

## Data Flow

1. CLI起動 → commander がコマンド・オプション解析
2. Campusmate の該当検索ページに GET → セッション Cookie 取得
3. 検索フォームデータを構築し POST (Cookie 付き) → 結果 HTML 取得
4. cheerio で結果テーブルをパース → 講義一覧を JSON 化
5. `--limit` に応じてページネーション制御（サイトは10件ずつ表示、次ページは POST で取得）
6. `detail` コマンドの場合: 詳細ページに GET → 全セクションをパース → JSON 化
7. stdout に JSON 出力、エラーは stderr へ

## Faculty Codes (開講学部・学府コード)

| Code | Name |
|---|---|
| `001` | 基幹教育 |
| `120` | 共創学部 |
| `010` | 文学部 |
| `020` | 教育学部 |
| `030` | 法学部 |
| `040` | 経済学部 |
| `050` | 理学部 |
| `061` | 医学部医学科 |
| `062` | 医学部生命科学科 |
| `063` | 医学部保健学科 |
| `070` | 歯学部 |
| `080` | 薬学部 |
| `090` | 工学部 |
| `105` | 芸術工学部 |
| `100` | 農学部 |
| `110` | 21世紀プログラム課程 |
| `501` | 大学院基幹教育 |
| `520` | 人文科学府 |
| `690` | 地球社会統合科学府 |
| `530` | 人間環境学府 |
| `550` | 経済学府 |
| `540` | 法学府 |
| `560` | 理学府 |
| `570` | 数理学府 |
| `650` | システム生命科学府 |
| `581` | 医学系学府医学専攻 |
| `610` | 工学府 |
| `660` | 芸術工学府 |
| `620` | システム情報科学府 |
| `630` | 総合理工学府 |
| `640` | 生物資源環境科学府 |
| `680` | 統合新領域学府 |

## Skill Registration

Claude Code スキルとして登録し、以下のようなトリガーで発動:
- 「シラバスを検索して」「講義を探して」
- 「○○先生の授業を調べて」
- 「○○について九大のシラバスで調べて」

スキルはユーザーの意図から適切なサブコマンドを選択し、`npx campusmate-cli ...` を Bash で実行、JSON 結果を解釈して自然言語で回答する。

## Error Handling

- HTTP エラー (timeout, 5xx): stderr にエラーメッセージ、exit code 1
- 検索結果 0 件: `{ "total": 0, "count": 0, "results": [] }` を返す
- 不正な講義コード: stderr にエラー、exit code 1
