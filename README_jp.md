# @severzemlya/campusmate-cli

九州大学 Campusmate-J の CLI ツール。シラバス検索に加え、ログインして自分の成績・時間割・お知らせを取得できます。構造化された JSON を出力し、[Claude Code](https://docs.anthropic.com/en/docs/claude-code) のスキルとして利用できます。

## 機能

- **講義名検索** — 講義名、担当教員、学部、開講時期で検索
- **教員検索** — 教員名から担当講義を検索（2段階検索）
- **全文検索** — シラバス全体をキーワード検索
- **詳細取得** — 講義コードから完全なシラバス情報を取得
- **ログイン後の機能**（九大 SSO でログイン）
  - **成績・GPA** — 成績一覧、科目区分別・学期別の GPA
  - **My時間割** — 曜日・時限ごとの履修講義（前期 / 後期）
  - **お知らせ・メッセージ** — 一覧（未読の絞り込み）、本文、添付ファイルのダウンロード

## 注意事項

- **非公式ツールです。** 九州大学および Campusmate の提供元とは一切関係ありません。
- **利用は自己責任です。** 本ツールの利用によって生じたいかなる結果についても、作者は責任を負いません（[MIT ライセンス](LICENSE)）。九州大学情報倫理規程などの学内規則を守るのは利用者自身です。
- **自分のアカウントでのみ使ってください。** 他人の SSO-KID・パスワードを扱ったり、他人に代わってログインしたりする用途には使わないでください。
- **アクセスは控えめに。** 本ツールは通信を逐次実行し、リクエスト間に待ち時間を入れていますが、短時間の大量実行や定期的な自動巡回は避けてください。
- **取得した情報の扱いに注意してください。** 成績は個人情報です。お知らせ・メッセージは学内向けの情報なので、外部に転載しないでください。
- **読み取り専用です。** 履修登録などの書き込み操作は行いません。ただし `notice` で本文を開いたメッセージはポータル上で既読になります。

## 必要要件

- Node.js 20+
- `ku-portal.kyushu-u.ac.jp` へのネットワークアクセス

## 使い方

インストール不要 — `npx` でそのまま実行できます：

```bash
npx @severzemlya/campusmate-cli search-lecture --name "線形代数"
npx @severzemlya/campusmate-cli search-lecture --name "物理" --faculty "050" --limit 20
npx @severzemlya/campusmate-cli search-instructor --name "田中"
npx @severzemlya/campusmate-cli search-fulltext --keyword "機械学習"
npx @severzemlya/campusmate-cli detail --code 26533320
```

グローバルインストールも可能：

```bash
npm install -g @severzemlya/campusmate-cli
campusmate-cli search-lecture --name "線形代数"
```

### 共通オプション

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `--year <年度>` | 対象年度 | 現在の年度 |
| `--limit <件数>` | 最大取得件数 | 10 |

## ログインが必要な機能

### ログイン

```bash
# 端末で SSO-KID とパスワードを入力（保存はされません）
campusmate-cli login

# 1Password の項目を使う（username / password 欄を参照。設定ファイルには参照だけを保存）
campusmate-cli login --op "op://Personal/<項目名またはID>"

# 環境変数でも指定可能（値に op:// 参照も使えます）
CAMPUSMATE_USERNAME=... CAMPUSMATE_PASSWORD=... campusmate-cli login
```

ログイン状態（Cookie）は `~/.config/campusmate-cli/session.json`（権限 600）に保存されます。セッションが切れていた場合は、各コマンドが次の順に自動で再ログインします。

1. 九大 SSO のセッションが残っていれば、パスワードなしで再ログイン
2. 環境変数または設定ファイル（1Password 参照）に認証情報があれば、それを使ってログイン
3. どちらもなければエラーになるので、`campusmate-cli login` を実行し直してください

パスワードを平文でファイルに保存する機能はありません。

```bash
campusmate-cli status            # セッションが有効か、認証情報の設定状況
campusmate-cli logout            # ログアウトしてセッションを削除
campusmate-cli logout --forget   # 1Password 参照の設定も削除
```

### コマンド

```bash
campusmate-cli grades                      # 成績一覧
campusmate-cli grades --year 2026          # 年度で絞り込み
campusmate-cli grades --gpa                # GPA（合計・区分別・学期別）
campusmate-cli timetable                   # My時間割（現在の学期）
campusmate-cli timetable --term 前期       # 前期 / 後期 を指定
campusmate-cli notices                     # メッセージ受信一覧
campusmate-cli notices --type univ --limit 20 --unread   # 大学からのお知らせ（未読のみ）
campusmate-cli notices --type job          # 就職のお知らせ
campusmate-cli notice --id 2300001 --type univ           # 本文を取得（既読になります）
campusmate-cli notice --id 2300001 --download            # 添付ファイルも保存（既定は一時ディレクトリ）
campusmate-cli notice --id 2300001 --download ./files    # 保存先を指定
```

| `--type` | 内容 |
|----------|------|
| `messages` | メッセージ受信一覧（既定） |
| `univ` | 大学からのお知らせ |
| `job` | 就職のお知らせ |

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

[Claude Code スキル](https://docs.anthropic.com/en/docs/claude-code/skills)定義が [`skills/campusmate-skill/SKILL.md`](skills/campusmate-skill/SKILL.md) にあります。

スキルディレクトリを Claude Code のスキルフォルダにコピーしてください：

```bash
cp -r skills/campusmate-skill ~/.claude/skills/
```

登録後、九州大学の講義やシラバス、教員について質問すると自動的にスキルが呼び出されます。例：

```
> 九大の線形代数の講義を検索して
> 田中先生の担当講義を調べて
> 講義コード 26533320 のシラバスを見せて
```

## 開発

```bash
npm install
npm run build       # TypeScript コンパイル
npm test            # テスト実行
npm run test:watch  # ウォッチモード
```

## 技術スタック

- TypeScript（ESM、Node16 モジュール解決）
- [Commander](https://github.com/tj/commander.js) — CLI フレームワーク
- [Axios](https://github.com/axios/axios) — HTTP クライアント
- [Cheerio](https://github.com/cheeriojs/cheerio) — HTML パーサー
- [tough-cookie](https://github.com/salesforce/tough-cookie) — Cookie 管理
- [Vitest](https://vitest.dev/) — テストフレームワーク

## ライセンス

MIT
