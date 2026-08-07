# PR #10 Markdown品質ゲート整備計画

## 0. 依頼概要

- 依頼内容: `markdownlint-cli2` を正式なローカル／CI品質ゲートへ追加し、PR #10のコーディング規約関連文書とRun Artifact生成元を整備する。
- 背景: 現在は通常Markdownを継続検証する共通コマンドがなく、Phase 1 CIと`pnpm run verify`にもMarkdownlintが接続されていない。
- 期待成果: `pnpm run lint:markdown` と`pnpm run verify`で同じMarkdown品質を検証し、CIも同じscriptを呼び出す。過去Run Artifactは変更せず、生成元の再発を防ぐ。

## 1. ゴール / 完了条件

- ゴール:
  - `markdownlint-cli2`を固定devDependencyとして追加する。
  - root設定で通常管理Markdownを対象にし、実在する生成物・依存物と`.codex/runs/**`を除外する。
  - MD022とMD029を有効なまま維持し、MD013は日本語文書・URL・表・コマンドとの実益を確認したうえで必要最小限に扱う。
  - Local、`verify`、Phase 1 CIが`pnpm run lint:markdown`という同一契約を使う。
  - CONTRIBUTING、CODE_REVIEW、CODING_STANDARDS、および必要なPROJECT_CONTEXTへ役割分担を記録する。
  - Run Artifactの過去履歴を変更せず、テンプレート等の生成元でMD022/MD029を再発させない。
- 完了条件（DoD）:
  - `pnpm run lint:markdown`、`pnpm run format:check`、`pnpm run lint`、`pnpm run typecheck`、`pnpm run test:contracts`、`pnpm run verify`が成功する。
  - 依存のfrozen installが成立し、Expo依存と`pnpm.packageExtensions`を維持する。
  - Phase 1 CIの既存quality jobへ同じscriptが追加され、既存のquality gateを弱めていない。
  - 変更対象外のNative実装、過去`.codex/runs/**`、無関係なMarkdownの意味が変更されていない。
  - Current RunのArtifact sanitizerのWrite + Checkが成功する。

## 2. 現状理解と前提

- Current understanding:
  - `HEAD`は`origin/main`を取り込んだ`agent/coding-standards`で、PR #9のNative／Run Artifact／Sanitizer修正を含む。作業開始時のsource差分はない。
  - `package.json`にMarkdownlint packageとscriptはなく、`verify`は`format:check -> lint -> typecheck -> validate:image-manifest -> security:check -> test -> build:web`である。
  - `.github/workflows/ci.yml`のPhase 1 `quality` jobはFormat、ESLint、Typecheck等を実行するが、Markdownlintは未接続である。
  - `.codex/templates/PLAN.md`、`TASKS.md`、`REPORT.md`がRun Artifactの生成元であり、`scripts/new-run.*`がそのままコピーする。
  - `scripts/verify`と`scripts/verify.ps1`はRun／Planningの英語見出しを文字列契約として確認するため、英語見出しの単純な日本語置換は安全でない。
  - `.prettierignore`はMarkdownを対象外としており、Prettierはコード整形、MarkdownlintはMarkdown構造・品質を担う分担になっている。
- Assumptions:
  - `markdownlint-cli2`は現時点のregistry latest `0.23.2`を既存の固定version方針に合わせてexactで追加する。
  - `.codex/templates`は生成元としてLint対象に含め、`.codex/runs`のみ履歴Artifactとして除外する。
  - 既存Markdownで形式修正が必要な場合は、意味を変えずに少量ずつ修正する。大量差分になるRuleは実測してconfigで最小限調整する。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。依頼文に対象、非目標、完了条件、Git操作禁止が明示されている。
- 仮定してよい細部: config形式、実在ディレクトリのignore列挙、MD013等の最小Rule調整はCLI実測に基づき決定する。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - package script／lockfile、Markdownlint設定、Phase 1 quality job、開発者向け文書、Run Artifactテンプレートと関連契約。
  - 通常Markdownの形式だけの修正、およびMarkdownlint設定でのRule評価。
- Files to inspect:
  - `package.json`、`pnpm-lock.yaml`、`.markdownlint-cli2.jsonc`
  - `.github/workflows/ci.yml`
  - `CONTRIBUTING.md`、`CODE_REVIEW.md`、`docs/CODING_STANDARDS.md`、`docs/PROJECT_CONTEXT.md`
  - `.codex/templates/*.md`、`.agents/**/*.md`、`docs/**/*.md`、その他通常Markdown
  - `scripts/verify`、`scripts/verify.ps1`、`tests/contracts/ci-workflow.test.ts`、Run Artifact関連contract test

## 5. 変更方針

- Change strategy:
  1. CLIの設定形式、default Rule、対象ファイルの違反数を確認する。
  2. `markdownlint-cli2@0.23.2`を`--ignore-scripts`でdevDependencyへ追加し、必要なlockfile差分だけを生成する。
  3. `.markdownlint-cli2.jsonc`へ通常Markdownのglob、実在する生成物／依存物のignore、MD022／MD029を含むRule設定を定義する。
  4. 現在の通常MarkdownとRun Artifact生成元をLintし、形式修正できる違反だけを最小差分で直す。機械契約の英語見出しは維持し、意味の大きい日本語化はdeferする。
  5. `package.json`の`lint:markdown`と`verify`、Phase 1 CIのquality job、CONTRIBUTING／CODE_REVIEW／CODING_STANDARDS／PROJECT_CONTEXTを更新する。既存のCI job、verify処理、Nativeコードは変更しない。
  6. focused contract、Markdownlint、format、lint、typecheck、full verifyを実行し、過去RunはCheck-onlyで確認する。
  7. Current Runへ事実と判断を追記し、sanitizerのWrite + Check後に完了判定する。
- 実行タスク:
  - [ ] 1. CLI／既存契約／対象Markdownのベースラインを確定する。
  - [ ] 2. package、lockfile、config、verify、CIを変更する。
  - [ ] 3. 通常Markdown、文書、Run Artifact生成元を最小差分で整える。
  - [ ] 4. focused／全品質ゲートを実行し、失敗を原因別に修正する。
  - [ ] 5. Run Artifactをsanitizerで確認し、最終報告と変更範囲を確定する。

## 6. 検証方法

- Validation plan:
  - `pnpm install --frozen-lockfile --ignore-scripts`
  - `pnpm run lint:markdown`
  - Run Artifact関連を含む`pnpm exec vitest run tests/contracts/ci-workflow.test.ts tests/contracts/codex-artifact-sanitization.test.ts --no-file-parallelism --maxWorkers=1`
  - `pnpm run format:check`
  - `pnpm run lint`
  - `pnpm run typecheck`
  - `pnpm run test:contracts`
  - `pnpm run verify`
  - `git diff --check`とsource変更範囲確認
  - `scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260808-070952-JST -Write -Check`
- 成功判定:
  - 上記の実行対象がexit code 0で、Markdownlintの対象・ignore・disable Ruleが設定と報告内容に一致する。
  - 過去RunをWriteせず、Current Runだけが新規Artifactとして保存される。
  - Remote CI、Native build、commit、push、PR更新は未実行として報告する。

## 7. リスクと未解決論点

- Risks:
  - default Ruleを通常Markdown全体へ機械適用すると、MD013等で意味の薄い大量差分が生じる可能性がある。違反件数を確認し、必要最小限のdisableまたは構造修正に留める。
  - Run Artifact見出しを日本語化すると`scripts/verify`等の文字列契約を壊す可能性がある。今回は英語見出しを維持し、互換対応が必要な日本語化はdeferする。
  - lockfile更新で既存Expo依存が変わる可能性がある。差分を確認し、Markdownlint追加に必要な変更以外は採用しない。
- Open questions: 実装中にCLI実測で判断し、解消できない場合はREPORTへ根拠と次アクションを記録する。

## 8. 成果物

- 変更ファイル: package／lockfile、Markdownlint設定、既存Phase 1 CI、開発者向け文書、必要な通常Markdown／生成元／contract test、Current Run Artifact。
- 付随ドキュメント: 本計画書、必要に応じたPROJECT_CONTEXTの履歴。

## 9. 備考

- Gitのmerge、rebase、pull、checkout、switch、branch作成、commit、push、PR更新は行わない。
- 過去`.codex/runs/**`の一括Lint、整形、日本語化、削除は行わない。
- Native機能、Maestro、Playwright、Architecture、Sanitizer本体、Action SHA、独自Markdown parserは今回の対象外とする。
