# PR #223 セキュリティfallbackのPRファイル検証計画

## 0. 依頼概要

- 依頼内容: PR #223の3経路でGitHub PRファイル一覧の各要素を検証し、実workflow内のページネーション処理を実行する回帰テストを追加する。
- 背景: 現在は応答全体が配列かだけを確認するため、`[{}]`などを対象外ファイルとして扱い、競合確認を不完全なまま進めるおそれがある。
- 期待成果: 不正な応答を既存の固定診断コードでfail-closedし、正常なページネーション、後方ページの競合検知、HTTP・JSON・通信失敗をCIで検証する。

## 1. ゴール / 完了条件

- ゴール: `read-alert`、`opencode-edit`、`publish`のすべてでPRファイル要素を検証し、実workflow由来Nodeスクリプトをfixtureで実行する契約テストを追加する。
- 完了条件:
  - 各要素が非null・非配列のオブジェクトで、`filename`が空白以外の文字列であることを確認する。
  - 1ページ101件以上を拒否し、既存の30ページ／3,000件上限は維持する。
  - 0、1、99、100、101、451、3,000件の境界と451件目の競合を実コードで確認する。
  - 不正JSON、要素不正、HTTP・通信・途中ページ失敗を各経路の診断コードで拒否する。
  - 指定契約テスト、Repository標準検証、最新HEADのWeb CI／Mobile App CIを確認し、PR #223本文を更新する。
  - PR #223をOpenのまま維持し、他PR、main、repository設定、secret、permission、L3動作を変更しない。

## 2. 現状理解と前提

- 現状理解:
  - PR #223はOpen・未マージ、baseは`main`、headは`codex/remediation/T06-security-fallback-pr-pagination-20261115`。
  - 作業開始時のPR head、ローカルHEAD、origin上のPR branchは`70508b5e075f17f77c8162bcfd5ca1887867479e`で一致する。
  - `origin/main`は`17de02cd1adfa3b167965d95a61265b4421393fd`。PR branchのHEADはこのmainをmerge済みで、再merge／rebaseは不要。
  - `git status --short`は空で、作業開始時の別作業はなかった。`git fetch origin`は初回に`.git`の読み取り専用制限で失敗したが、許可されたsandbox escalation後に成功し、PR APIのhead・baseとローカルrefが一致した。
  - PR差分はworkflow 1ファイルのみ。既存テスト21件はページ取得関数をHTTP fixtureで実行しない。PR本文には過去の一時Node harnessの説明があるが、CIに残る実workflow回帰テストではない。
  - PRのレビュー記録は空で、会話・Plan・Run・PR本文の調査から今回のworkflow検証追加に対する既存L2承認を確認できなかった。
- 前提:
  - ユーザーは2026-11-17に、3つの取得処理への要素検証・1ページ100件上限、および依頼済みfixture回帰テストを明示承認した。
  - `scripts/verify`の旧文言literal 12件の更新、残る42件の更新、および子プロセス実行可能な一時検証環境での契約suite実行を追加承認した。永続的なsandbox/L3設定は変更しない。
  - HTTP fixtureはローカルNode実行に注入し、GitHub APIへ通信しない。
  - 正常なAPI URL、認証header、HTTP失敗、競合条件、診断コード、3,000件上限、権限範囲は維持する。
- 対象外:
  - `workflow_dispatch`実行、permission/sandbox/approval/wrapper変更、依存追加、別PR、main変更、merge、PR close。

## 3. 質問 / 曖昧性

- 承認が必要だった点: `.github/workflows/security-dependency-fallback.yml`の変更はAGENTS.md §8のL2承認対象。既存承認は見つからなかったため具体案を提示し、2026-11-17に明示承認を得た。続けて`docs/reference/run-artifacts.md`の12件、および他3つのcanonical referenceに対する42件の検証literal更新、子プロセス実行可能な一時検証環境もユーザー承認済み。
- 仮定してよい細部: ページが100件を超えた場合は、その箇所の既存`*_files_invalid`診断コードで拒否する。
- 未回答の重要質問: なし。実装承認は3つの取得処理の要素検証、1ページ100件上限、fixture回帰テスト。追加承認は検証literal 54件更新と子プロセス実行可能な一時検証環境。

## 4. 影響範囲

- 影響範囲:
  - API応答の形状がGitHub契約と異なる場合だけ停止条件が増える。正常な0～100件ページの処理と後続競合判定は維持する。
  - テストは実workflow内の各Node heredocを抽出して、fixture HTTP応答で実行する。テスト専用`fetchPullFiles`の複製は作らない。
  - job、step順序、権限、endpoint、Authorization header、通常のfallback起動条件は変更しない。
- 確認対象ファイル:
  - `.github/workflows/security-dependency-fallback.yml`
  - `tests/contracts/security-dependency-fallback-workflow.test.ts`
  - `scripts/verify`（承認済みの検証範囲拡張。参照文書の内容は変更しない）
  - 本PlanとPR #223用Run Artifact

## 5. 変更方針

- 変更方針:
  1. 各ページのJSONを読んだ直後に、配列、最大100要素、各要素のobject/non-array、`filename`のstring/non-blankを検証する。不正なら既存の`open_pr_files_invalid`、`related_pr_files_invalid`、`publish_pr_files_invalid`で停止する。
  2. 既存のtest helperで3箇所のNode heredocを抽出し、mocked `fetch`・一時fixtureを注入して実workflowコードを実行する。
  3. 境界値、後方ページ競合、不正応答、HTTP・JSON・通信・途中失敗とログ非露出を検証する。
  4. 修正前の`[{}]`の失敗を記録し、workflow修正とテストを回帰検証する。
  5. 全ゲート後にPR branchだけへcommit/pushし、PR本文と最新headのCI記録を更新する。mergeしない。
- 実行タスク:
  - [x] 1. 最新PR、branch、main、worktree、既存差分・レビューを確認する。
  - [x] 2. 既存L2承認記録を調べる。確認できなかったためworkflow編集前に明示承認を得る。
  - [x] 3. 3箇所の取得処理に対するL2承認を得た。
  - [x] 4. 実workflowを実行する回帰テストを追加し、修正前`[{}]`の失敗を確認する。
  - [x] 5. 3箇所へfail-closedの要素・ページサイズ検証を追加する。
  - [x] 6. 指定テスト、契約テスト全体、標準ゲート、actionlintを実行して結果を分類する。
  - [x] 7. Run/Planを最終検証結果に合わせて更新し、差分・scope・sanitizationを確定する。
  - [ ] 8. 既存PR branchへcommit/pushし、PR本文と最新PR head CIを確認する。

## 6. 検証方法

- 検証計画:
  - 既存helper `jobBlock`、`stepBlock`、`heredocNodeScript`、`runNodeScript`を再利用する。
  - 0件、1件、99件、100+0件、100+1件、451件、30ページ各100件を検証し、451件目の依存関係競合を検出する。
  - `null`、object、配列要素null/object、filename欠落/null/数値/空文字/空白文字、101要素ページを検証する。
  - HTTP 403/404/500、transport例外、JSON parse失敗、途中ページ失敗を検証し、部分結果が成功扱いされないことを確認する。
  - 3つの経路で要素不正・HTTPの既存診断コードを検証し、JSON／通信例外は非ゼロ失敗すること、fixtureデータや認証情報がstdout/stderrへ出ないことを確認する。
  - 指定されたfocused Vitest、`pnpm run test:contracts`、format/lint/typecheck/security/verify、`git diff --check`、利用可能な場合はactionlintを実行する。
  - push後、最新headのWeb CI／Mobile App CIとPR本文を照合する。`workflow_dispatch`は起動しない。
- 成功判定: すべてのローカル必須ゲートが成功し、最新HEADのWeb CIとMobile App CIがsuccess。未実行・未確認は完了条件に含めない。

## 7. リスクと未解決論点

- リスク:
  - 100件を超える単一ページ応答を拒否するため、GitHub API契約外のfixtureやproxy応答はfail-closedになる。
  - 現在のツール一覧にRepository標準`wait_for_required_ci`がなく、push後に最新CIが未完了の場合、規約上pollingへ代替できない可能性がある。
  - `bash scripts/verify`は3つのcanonical referenceに対して54件の現行表現と異なるpositive literalを持っていた。ユーザー承認後、`scripts/verify`内の12件と追加42件を現行の正本文言へ合わせ、reference文書自体は変更せずに再実行してPASSした。
  - 全契約suiteは承認された一時検証環境でも完了せず、中断前に独立したHook並行追記失敗、PowerShell/WSLパス互換失敗、2件の30秒テストtimeoutを観測した。focused 28/28とstandard gatesはPASSしたが、suite最終集計は未取得であり、Hookケースのベースラインも未実行。対象外コードは変更しない。
  - `scripts/new-run.sh`はCRLFのため正規化したstreamから実行した。Runディレクトリ作成は`.codex`のsandbox制限により承認済みescalationを使った。
- 未解決の質問: なし。承認範囲内で実装と検証を進める。

## 8. 成果物

- 変更ファイル:
  - `.github/workflows/security-dependency-fallback.yml`
  - `tests/contracts/security-dependency-fallback-workflow.test.ts`
  - `scripts/verify`（ユーザー承認済みの54 literal更新）
  - `docs/plans/2026-11-17_173821_pr223-security-fallback-file-validation.md`
- 付随ドキュメント: `.codex/runs/20261117-173821-JST/`

## 9. 備考

- 本Planは3箇所の要素検証・単一ページ上限・fixture回帰テストに対するL2承認と、検証契約の更新・一時検証環境に対する追加承認を反映する。permission/sandbox/approval/wrapperの変更は含まない。
- 現時点の具体案は、3箇所それぞれで配列要素の型と`filename.trim()`、ページ長100以下を確認し、既存の固定診断で停止する内容である。
