# GitHub Actions Lockfileとsecurity-only更新への切替

## 0. 依頼概要

- 依頼内容: PR #224でGitHub Actions依存を公式`gh-actions-lock`のlockfile管理へ移行し、Dependabot Security Updatesだけを扱える状態にする。
- 背景: 既存workflowは外部Actionを完全なcommit SHAで固定しているため、DependabotがActionのバージョンとsecurity-only修正PRを扱えるよう、変更参照と実行commit固定を分離する。
- 期待成果: Actionの実行commitを変えずに、レビュー可能なPR #224へlockfile、CI整合性確認、テスト、運用文書を反映する。

## 1. ゴール / 完了条件

- ゴール: 既存7 workflowの外部Action参照を、SHAから同じcommitを指すことが確認できた公式release tagへ移し、GitHub公式CLIが生成した`.github/workflows/actions.lock`で実行commitを固定する。
- 完了条件（DoD）:
  - 外部Action参照120件と3件の同一Repository内workflow参照を棚卸しする。
  - 既存SHAごとに公式release tagとcommitの一致を確認する。対応tagがないものは推測せず、変更しない理由を記録する。
  - 7 workflowがCLI生成lockfileに含まれ、`gh actions-lock --verify`がCIで欠落・不整合を検出する。
  - `open-pull-requests-limit: 0`を含むDependabotのActions-only設定を維持する。
  - SHA直固定のテストをlockfile整合性へ置き換え、checkout credential、Cloudflare Secret、Preview除外などのsecurity contractを維持する。
  - 現行運用文書を更新し、旧Planは保持して本Planに変更理由を記録する。
  - Dependabot security PRのlock自動同期は、実際のsecurity PRまたは脆弱性がない場合「未検証」と記録する。
  - 最新PR headのWeb CI・Mobile App CIを確認し、検証結果と残余リスクをPR本文へ記録する。merge／closeは行わない。

## 2. 現状理解と前提

- 現状理解:
  - 対象は`ryu-yoshikawa-pro-vision/qa-training-store`のDraft PR #224、base `main`、head branch `codex/t08-actions-security-only-20261115`。
  - 確認時のPR headとlocal HEADは`ffe51347c68f764f24bb2707dedf1e50c90bd493`。PR metadataでheadを照合し、Web CIとMobile App CIは両方success。
  - `.github/workflows/`には7ファイル、外部Action参照は120件、異なるSHA参照は11種類。同一Repository内の再利用workflow参照は3件。
  - `tests/contracts/ci-workflow.test.ts`は外部参照すべてに40文字SHAを要求し、`native-ci-workflow.test.ts`もSHA値を直接固定している。
  - `.github/dependabot.yml`はGitHub Actions、weekly、`open-pull-requests-limit: 0`を設定済み。
  - `CONTRIBUTING.md`と現行`docs/PROJECT_CONTEXT.md`はSHA直接固定を運用契約としている。旧方針のPlanとhistory文書は履歴として保持する。
- 前提:
  - 公式`github/gh-actions-lock`の現行release `v0.4.1`を確認対象とし、CIでは同releaseを指定してextensionを導入する。
  - 11種類すべてのSHAが既存の公式version tagと対応することをGitHub APIで確認した。9件はtag先commitが元のSHAと一致し、pnpm v4.4.0とGradle v5.0.0は署名済みannotated tag objectのSHAが元の参照と一致する。後者のpeel先commit SHAはtag object SHAと異なるため、同じversion tagを使い、実行commitはlockfileで固定する。ユーザーはこの2件の同一version tagへの移行を明示承認済み。
  - 3件の`jobs.<job_id>.uses`は同一repository内のreusable workflow参照なので変更しない。公式CLIの`--migrate-local-actions`はlocal step action用であり、これらのworkflow参照へ適用しない。各workflow内のremote Action参照をlock対象とする。
  - CLI生成中の他jobもSHA固定のまま実行できるよう、一時bootstrap jobは自身のrunner worktreeだけで検証済みversion tagへ変換してから公式CLIを実行する。生成差分のversionが既存値と違う場合は採用しない。
  - repository／organization security settingやtoken権限は変更しない。
- 対象外:
  - Actionの機能バージョンまたは解決commitの更新、npm/Renovate設定、Expo更新workflow、Cloudflare Secret、Preview条件、アプリケーションコード、別PR・別Repository。
  - `main`への直接push、force push、merge、PR close、security設定・permission変更。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。対象PR、目標、変更禁止事項、security acceptanceの未検証時の扱いは指定済み。
  - 仮定してよい細部: 既存versionと一致する公式tagだけを使い、CLIが解決したcommitを正本のlockfileへ記録する。ローカルのGitHub DNS制限がある場合、CLI生成の取得にはPR runner上の公式CLIを使う。
- 未回答の重要質問: lockfile実行制御のrepository／organization適用状態とDependabot Security Updatesの現在状態は読み取りで確認できず、変更もしない。確認可能な範囲を調査し、最終リスクとして明記する。

## 4. 影響範囲

- 影響範囲: `.github/workflows/`のAction参照・lockfile・CI、Actions参照契約テスト、現行のContributor / Project Context説明、RunとPlan。
- 確認対象ファイル: `.github/workflows/*.yml`、`.github/dependabot.yml`、`tests/contracts/ci-workflow.test.ts`、`tests/contracts/native-ci-workflow.test.ts`、関連するWorkflow contract tests、`CONTRIBUTING.md`、`docs/PROJECT_CONTEXT.md`、`docs/history/`。

## 5. 変更方針

- 変更方針: 公式CLIが既存SHAと一致するtagだけに参照を書き換える。CLI生成lockfileをCIで検証し、依存更新のsecurity-only条件と従来のsecurity boundaryを保つ。
- 実行タスク:
  - [ ] 1. 対象PR/HEAD、CI baseline、全120外部参照、local reusable workflow、Dependabot設定、security contractを再確認する。
  - [ ] 2. 公式CLIでtag対応を検証し、全workflowをlockする。3件のlocal reusable workflow参照は保持する。
  - [ ] 3. `.github/workflows/actions.lock`とtag参照、lock verify CIを実装する。
  - [ ] 4. SHA前提契約をlockfile整合性契約に更新し、security関連の既存assertionを維持する。
  - [ ] 5. CONTRIBUTINGとPROJECT_CONTEXT、Project Context historyを更新し、同期が働かない場合の公式CLI手順・権限を記録する。
  - [ ] 6. focused tests、Repository verify、format/lint、CLI verify、差分とRun Artifact sanitizerを実行する。
  - [ ] 7. 許可されたファイルだけをcommitし、既存PR branchへfast-forward pushする。
  - [ ] 8. 最新HEADのWeb CI/Mobile App CIを確認し、正確な結果と未検証範囲をPR本文に記録する。

## 6. 検証方法

- 検証計画: 公式`gh actions-lock --verify`、YAML構文確認、対象contract tests、`bash scripts/verify`、format/Markdown/text lint、`git diff --check`、Run Artifact sanitizer、7 workflowとlockfileのcoverage比較、Cloudflare/fork/Dependabot境界の差分reviewを行う。最終CIは最新PR headで確認する。
- 成功判定: CLI verifyと各ローカルゲートが成功し、全変更Action参照が同一commitのtagを使い、security contractに回帰がなく、最終headのWeb CI/Mobile App CIがsuccessであること。

## 7. リスクと未解決論点

- リスク:
  - 公式GitHub docsではlockfile runtime enforcementにGitHub plan / policy条件がある。現在のrepository／organization設定を確認できない場合、lockfileがCIで検証できてもrunner実行への強制は未確認として報告する。
  - Dependabotのsecurity PRがなく、自動同期を実証できない場合は未検証とする。
  - ローカルshellからGitHubへDNS解決できず、ローカルCLI導入もできない。公式CLIの生成・検証がPR runnerで実行できない場合は成功と扱わない。
  - `wait_for_required_ci` toolが利用可能なtool一覧にない。Repository harness上、代替pollingは禁止されているため、最新head CI待機ができなければ明示的な未達として残す。
- 未解決の質問: GitHub plan/policy、Dependabot alerts/security updates状態、対象のsecurity PRの有無。

## 8. 成果物

- 変更ファイル: `.github/workflows/*.yml`、`.github/workflows/actions.lock`、関連contract tests、`.github/dependabot.yml`（意味維持）、`CONTRIBUTING.md`、`docs/PROJECT_CONTEXT.md`、`docs/history/`、本Plan、Run Artifact。
- 付随ドキュメント: PR #224本文へ最新headのCI結果、実施した検証、security PR自動同期の未検証状況、残余リスクを記録する。

## 9. 備考

- L2 workflow変更の事前承認は、本依頼の具体的な実装指示で受領したものとして扱う。
- 旧Plan `2026-11-15_144500_dependabot-actions-security-only.md` と既存Runは変更しない。
- 作業開始時に`bash scripts/new-run.sh`はCRLFにより失敗した。PowerShellも利用不可のため、同scriptを一時的にLF化しrepo pathだけ固定したcopyでRunを初期化した。source scriptは編集していない。
