# B計画: PRを日本語で運用するルールの追加

## Goal

- 最新`origin/main`から作成した別branchで、Codexが作成・更新するPull Requestのタイトルと本文を原則日本語にするrepository運用ルールを`AGENTS.md`へ追加する。

## Current understanding

- AのPR #62 branchとは分離した`docs/japanese-pull-request-policy` branchを`origin/main`（`74834bf...`）から作成した。
- 最新mainには`.github/pull_request_template.md`が存在し、英語の見出しと説明コメントを持つ。
- 既存templateがPR本文の英語固定部分を作るため、AGENTS.mdの日本語ルールと矛盾する部分だけを最小修正する。

## Assumptions

- PR templateの構成は維持し、見出しと説明コメントの日本語化だけを行う。
- GitHub ActionsによるPR言語強制、lint、PreToolUse、Issue #60対応は追加しない。
- BのPRはこのbranchの`AGENTS.md`と既存PR templateの最小修正だけを含める。

## Non-goals

- PR #62、Issue #59のdependency、lockfile、workflow、application codeの変更。
- PR #62 branchへの`AGENTS.md`追加。
- 新しいPR template、言語自動チェック、全application test、Native build。
- PRのmerge、mainへの直接commit/push、force push。

## Impacted areas / Files to inspect

- `AGENTS.md`
- `.github/pull_request_template.md`
- `.codex/runs/20260825-135622-JST/`
- `docs/plans/TEMPLATE.md`
- `scripts/sanitize-codex-artifacts.ps1`

## Change strategy

- `AGENTS.md`のGit/GitHub運用に近い位置へ、PRタイトル・本文の日本語ルールを一度だけ追加する。
- 既存PR templateの英語固定見出し・説明コメントだけを日本語へ置き換える。
- JSON parse、対象Markdown lint、format check、`git diff --check`、sanitizerを実行する。
- branch safetyを確認し、変更ファイルだけを明示stageしてcommit、explicit refspecでpushする。
- 日本語の別PRを作成し、title/body、base/head、open・未mergeを確認する。

## Validation plan

- `pnpm exec markdownlint-cli2`で変更Markdownを確認する。
- `pnpm exec prettier --check AGENTS.md .github/pull_request_template.md`を確認する。
- `git diff --check`とJSON parseを確認する。
- `scripts/sanitize-codex-artifacts.ps1 -Write -Check`でresidual finding 0を確認する。
- PR作成後に`gh pr view`でtitle/bodyが日本語、baseがmain、headが本branch、stateがOPEN、mergedAtがnullであることを確認する。

## Risks / Open questions

- 既存templateを変更しすぎるとPR #62以外へ影響するため、固定見出しとコメントの翻訳に限定する。
- ユーザーの明示的な別言語指定は新ルールより優先する。
- 未解決のblocking questionはない。

## Definition of Done

- `AGENTS.md`に指定されたPR日本語運用ルールが重複なく追加される。
- 既存PR templateの英語固定部分が日本語化される。
- local validationとsanitizerが成功する。
- 別branch・別PRが日本語title/bodyで作成され、両PRともmergeされていない。

## Notes

- 既存templateの項目数と構造は変更しない。
