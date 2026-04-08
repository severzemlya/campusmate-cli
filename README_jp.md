# campusmate-skill

九州大学 Campusmate-J シラバス検索 CLI ツール。構造化された JSON を出力し、[Claude Code](https://docs.anthropic.com/en/docs/claude-code) のスキルとして利用できます。

## 機能

- **講義名検索** — 講義名、担当教員、学部、開講時期で検索
- **教員検索** — 教員名から担当講義を検索（2段階検索）
- **全文検索** — シラバス全体をキーワード検索
- **詳細取得** — 講義コードから完全なシラバス情報を取得

## 必要要件

- Node.js 20+
- `ku-portal.kyushu-u.ac.jp` へのネットワークアクセス

## インストール

```bash
git clone https://github.com/<owner>/campusmate-skill.git
cd campusmate-skill
npm install
npm run build
```

## 使い方

全コマンドは JSON を標準出力に出力します。

### 講義名検索

```bash
node dist/index.js search-lecture --name "線形代数"
node dist/index.js search-lecture --name "物理" --faculty "050" --limit 20
```

### 教員検索

```bash
node dist/index.js search-instructor --name "田中"
```

### 全文検索

```bash
node dist/index.js search-fulltext --keyword "機械学習"
node dist/index.js search-fulltext --keyword "deep learning" --match any
```

### シラバス詳細取得

```bash
node dist/index.js detail --code 26533320
```

### 共通オプション

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `--year <年度>` | 対象年度 | 現在の年度 |
| `--limit <件数>` | 最大取得件数 | 10 |

## 出力形式

### 検索結果

```json
{
  "total": 38,
  "count": 10,
  "results": [
    {
      "code": "26533320",
      "name": "線形代数学・同演習A",
      "semester": "前期",
      "schedule": "火3",
      "instructor": "山田 太郎"
    }
  ]
}
```

### シラバス詳細

```json
{
  "code": "26533320",
  "name": "線形代数学・同演習A",
  "instructor": "山田 太郎",
  "credits": 3,
  "year": 2026,
  "semester": "前期",
  "schedule": "火3",
  "purpose": "...",
  "syllabus": [
    { "week": 1, "theme": "ガイダンス", "content": "..." }
  ]
}
```

完全な型定義は [`src/types.ts`](src/types.ts) を参照してください。

## Claude Code スキル設定

このツールは [Claude Code スキル](https://docs.anthropic.com/en/docs/claude-code/skills)として登録できます。スキル定義は [`SKILL.md`](SKILL.md) にあります。

### 方法 A: プロジェクト単位の設定

スキルを使いたいプロジェクトの `.claude/settings.json` に追加：

```json
{
  "skills": [
    "/path/to/campusmate-skill"
  ]
}
```

### 方法 B: ユーザー単位の設定（全プロジェクトで利用可能）

`~/.claude/settings.json` に追加：

```json
{
  "skills": [
    "/path/to/campusmate-skill"
  ]
}
```

### 方法 C: CLI で追加

```bash
claude skill add /path/to/campusmate-skill
```

### 動作確認

登録後、九州大学の講義やシラバス、教員について質問すると自動的にスキルが呼び出されます。例：

```
> 九大の線形代数の講義を検索して
> 田中先生の担当講義を調べて
> 講義コード 26533320 のシラバスを見せて
```

## 開発

```bash
npm run build       # TypeScript コンパイル
npm test            # テスト実行（51テスト）
npm run test:watch  # ウォッチモード
```

## 技術スタック

- TypeScript（ESM、Node16 モジュール解決）
- [Commander](https://github.com/tj/commander.js) — CLI フレームワーク
- [Axios](https://github.com/axios/axios) — HTTP クライアント
- [Cheerio](https://github.com/cheeriojs/cheerio) — HTML パーサー
- [Vitest](https://vitest.dev/) — テストフレームワーク

## ライセンス

MIT
