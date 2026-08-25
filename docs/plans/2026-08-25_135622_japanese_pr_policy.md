# 計画書: Pull Requestの日本語運用ルール追加

## 0. 依頼概要

- 依頼内容: Codexが作成・更新するPull Requestのタイトルと本文を原則日本語にするルールを`AGENTS.md`へ追加し、別branch・別PRで公開する。
- 背景: PR #62の最終整理時に、PR本文の言語が揺れたため、repository-level Working Agreementとして明文化する。
- 期待成果: 今後のPR title/bodyが原則日本語で作成・更新され、技術識別子とユーザー指定の別言語は例外として扱える。

## 1. ゴール / 完了条件

- ゴール: `AGENTS.md`へ重複のない日本語PR運用ルールを追加する。
- 完了条件（DoD）:
  - 最新`origin/main`から作成した別branchに変更を限定する。
  - 既存templateの英語固定部分を必要最小限だけ日本語化する。
  - Markdown、format、diff check、sanitizerが成功する。
  - 日本語title/bodyの別PRを作成し、mergeせず停止する。

## 2. 現状理解と前提

- Current understanding:
  - branchは`docs/japanese-pull-request-policy`、baseは`main`、開始HEADは`74834bf...`。
  - `.github/pull_request_template.md`が存在し、英語の固定見出しと説明コメントを持つ。
- Assumptions:
  - templateの構造・項目数は変えず、見出しと説明コメントのみ翻訳する。
- Non-goals:
  - PR #62やIssue #59の変更、PR #58、Issue #60、workflow、言語自動チェック、PR template新設。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。
- 仮定してよい細部: 既存templateの英語固定文は新ルールと矛盾するため、最小修正対象とする。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas: repository運用文書、既存PR template。
- Files to inspect: `AGENTS.md`、`.github/pull_request_template.md`、`.codex/runs/20260825-135622-JST/`、sanitizer。

## 5. 変更方針

- Change strategy: `AGENTS.md`に規則を一箇所追加し、templateの既存見出し・コメントを日本語化する。自動強制や新規仕組みは追加しない。
- 実行タスク:
  - [x] 1. 最新main、branch、template、変更位置を確認する。
  - [x] 2. `AGENTS.md`とtemplateを編集する。
  - [x] 3. local validationとsanitizerを実行する。
  - [x] 4. 明示stage、commit、explicit refspec push、別PR作成を行う。

## 6. 検証方法

- Validation plan: JSON parse、対象Markdown lint、Prettier check、`git diff --check`、sanitizer、PR metadata確認。
- 成功判定: 変更対象が文書2件とRun/planに限定され、PR title/bodyが日本語、stateがOPEN、mergedAtがnullであること。

## 7. リスクと未解決論点

- Risks: templateを過剰変更すると既存PR作成フローへ不要な影響が出るため、翻訳に限定する。
- Open questions: なし。

## 8. 成果物

- 変更ファイル: `AGENTS.md`、`.github/pull_request_template.md`、B用Run Artifact。
- 付随ドキュメント: 本plan。

## 9. 備考

- PRは作成するがmergeしない。mainへ直接pushしない。
