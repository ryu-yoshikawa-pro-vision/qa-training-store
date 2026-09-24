# CI待機をAgent外へ委譲する計画

## 0. 依頼概要

- 依頼内容: 実装・push後のCI確認でAgentが状態確認を反復してトークンを消費する運用をやめ、CI終了時にだけAgentへ制御を戻す。
- 背景: 現在のRepository契約では最新PR headの必須CI確認が完了条件に含まれるが、待機方法は「無制限pollingや独自の監視scriptを追加しない」とだけ定義されている。
- 期待成果: GitHub CLIを単一のblocking command内で待機させ、待機中にAgentの判断ループを発生させない契約へ更新する。

## 1. ゴール / 完了条件

- ゴール:
  - push後のCI待機をAgentによる複数回の状態確認からGitHub CLI側の待機へ移す。
  - CI成功または失敗が確定した時点でAgentが処理を再開できるようにする。
  - 既存の「最新PR headでWeb CI / Mobile App CIを確認する」「旧headの結果を流用しない」契約を維持する。
- 完了条件（DoD）:
  - `docs/reference/codex-implementation-harness.md` がCI待機方法の正本として、Agentによる反復確認を禁止し、blocking commandへ待機を委譲する手順を明示する。
  - push直後にcheckが未登録でもAgentへ即座に制御が戻らないよう、check登録待ちを同一blocking command内でboundedに行う。
  - check登録後は `gh pr checks <PR> --watch --fail-fast` を使い、成功完了または最初のfailureで終了する。
  - registration waitには上限を設け、上限到達・認証失敗・GitHub API失敗は通常のfailureとしてAgentへ返す。無限待機にしない。
  - `scripts/verify` と `scripts/verify.ps1` のsemantic contract確認を新しい契約へ同期し、Bash / PowerShell両方のverifyがPASSする。
  - `AGENTS.md`、GitHub Actions workflow、Hook、常駐サービス、新しい監視scriptは変更しない。

## 2. 現状理解と前提

- 現状理解:
  - `AGENTS.md` はfile-changing taskのcommit / push / PR / CI lifecycleの正本を `docs/reference/codex-implementation-harness.md` としているため、rootへ詳細を重複させる必要はない。
  - `docs/reference/codex-implementation-harness.md` は通常PRの必須CIを `Web CI` と `Mobile App CI` と定義し、pushした最新commitをheadとするPRで確認する契約を持つ。
  - 同文書には現在「`queued` / `in_progress`を理由に無制限pollingや独自の監視scriptを追加しない」とある。
  - `scripts/verify` と `scripts/verify.ps1` は上記文言をliteralで検証している。正本文書だけを変更するとRepository標準verifyが失敗する。
  - GitHub CLI公式manualでは `gh pr checks --watch` はchecks完了まで監視し、`--fail-fast` は最初のcheck failureでwatchを終了する。watch modeの既定refresh intervalは10秒。
  - GitHub CLI実装ではstatus checkが0件の場合、`gh pr checks` は `no checks reported on the '<branch>' branch` エラーを返す。そのためpush直後から単純に `--watch` するだけではregistration raceを吸収できない。
- 前提:
  - GitHub CLIは現在のAgent実行環境ですでに利用されており、過去Runでも `gh pr checks <PR> --watch` の実績がある。
  - 待機中のGitHub API polling自体は許容し、削減対象はAgent/LLMによる状態解釈の反復とする。
- 対象外:
  - GitHub Actionsの `workflow_run` で別Agent sessionを起動する構成。
  - webhook受信サーバー、queue、常駐orchestrator。
  - 新しいRepository scriptや外部依存関係。
  - CI定義、required checks、branch protectionの変更。
  - repair-loop自体の再設計。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。
- 仮定してよい細部:
  - registration waitの具体的な試行回数・間隔は、GitHub API負荷と待機時間の上限が明確になるbounded値として実装時に固定する。設定項目化はしない。
  - `gh pr checks --watch --fail-fast` はPR上のchecks全体を監視する。file-changing taskの完了判定は従来どおりRepository契約の `Web CI` / `Mobile App CI` successと最新head一致で行う。
- 未回答の重要質問: なし。

## 4. 影響範囲

- 影響範囲:
  - CI待機契約の正本文書。
  - 正本文書のsemantic contractを固定しているBash / PowerShell verify。
- 確認対象ファイル:
  - `AGENTS.md`
  - `docs/reference/codex-implementation-harness.md`
  - `scripts/verify`
  - `scripts/verify.ps1`
  - `.github/workflows/ci.yml`
  - `.github/workflows/native-ci.yml`
- 外部仕様:
  - GitHub CLI manual: https://cli.github.com/manual/gh_pr_checks
  - GitHub CLI source（0 checks時のerror）: https://github.com/cli/cli/blob/b6770c8bc54c72e74e785c307850446b8e10be9d/pkg/cmd/pr/checks/checks.go

## 5. 変更方針

- 変更方針:
  - 既存の責務分離を維持し、詳細契約は `docs/reference/codex-implementation-harness.md` だけに置く。`AGENTS.md` は変更しない。
  - Agentへ複数回のtool callをさせるretry loopは使わない。1回のshell tool call内で「check登録待ち → watch」を完結させる。
  - check登録待ちは `gh pr view <PR> --json statusCheckRollup` 等で0件かを判定し、bounded retryする。retryごとにAgentへ制御を戻さない。
  - checkが1件以上登録されたら同じblocking command内で `gh pr checks <PR> --watch --fail-fast` へ移る。
  - `gh pr checks --watch` の成功だけでtask完了とはしない。終了後に最新PR headとRepository必須CIの結果を従来契約どおり確認する。
  - failure時は既存 `docs/reference/repair-loop.md` へ委譲し、今回の変更でrepair policyを増やさない。
- 実行タスク:
  - [ ] 1. `docs/reference/codex-implementation-harness.md` のCI lifecycleへ、単一blocking commandによるbounded registration waitと `gh pr checks --watch --fail-fast` の契約を追加する。
  - [ ] 2. 既存の「無制限pollingや独自監視scriptを追加しない」契約を、新契約と矛盾しない表現へ更新する。
  - [ ] 3. `scripts/verify` のliteral contractを新しい正本文言へ同期する。
  - [ ] 4. `scripts/verify.ps1` のliteral contractを同じ意味へ同期する。
  - [ ] 5. 差分で `AGENTS.md`、workflow、Hook、新規script、依存関係が変更されていないことを確認する。
  - [ ] 6. Repository標準verifyをBash / PowerShellで実行し、両方PASSを確認する。

## 6. 検証方法

- 検証計画:
  - `bash scripts/verify`
  - `powershell -ExecutionPolicy Bypass -File scripts/verify.ps1`
  - `git diff --check`
  - 変更ファイル一覧を確認し、予定した3ファイル以外にsource変更がないことを確認する。
  - 可能なら既存PRまたは検証用PRで、単一blocking commandが次の3状態を扱うことを確認する。
    - check未登録から登録され、その後successまで待機する。
    - check failureで `--fail-fast` がnon-zero終了し、Agentへ制御が戻る。
    - registration wait上限到達時に無限待機せずnon-zero終了する。
- 成功判定:
  - Bash / PowerShellの標準verifyがPASSする。
  - CI待機中にAgent側の状態確認ループを要求しない契約になっている。
  - registration raceと無限待機の両方に停止条件がある。
  - 最新head / Web CI / Mobile App CIの既存完了契約を弱めていない。

## 7. リスクと未解決論点

- リスク:
  - `gh pr checks --watch` だけを記載すると、check未登録時に即時errorとなり目的を安定して達成できない。bounded registration waitを同じblocking commandへ含めて防ぐ。
  - registration waitをRepository script化すると、今回の小さい運用改善に対して保守対象が増える。inline blocking commandの契約に留める。
  - `--fail-fast` はRepository必須CI以外のPR check failureでも終了し得る。終了後のfailure分類は既存repair-loopで行い、完了条件はRepository必須CIの契約を維持する。
  - literal contractを片方のverifyだけ更新するとOS間で検証結果がずれるため、Bash / PowerShellを同時に変更する。
- 未解決の質問: なし。

## 8. 成果物

- 実装時の変更予定ファイル:
  - `docs/reference/codex-implementation-harness.md`
  - `scripts/verify`
  - `scripts/verify.ps1`
- 今回のPlan PRで追加するファイル:
  - `docs/plans/2026-09-24_200458_ci-wait-without-agent-polling.md`
  - plan-only Run Artifact
- 付随ドキュメント:
  - `AGENTS.md` は既存導線で十分なため変更しない。

## 9. 備考

- 今回のPRはPlanのみ。CI待機契約・verifyの実装変更は次の実装工程で行う。
- 新しいGitHub Actions、Hook、監視サービス、常駐processは導入しない。
