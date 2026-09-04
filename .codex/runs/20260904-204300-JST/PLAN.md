# Plan

## Objective

- Issue #101を、`codex-task.ps1`のnative stdoutとexit codeの分離、回帰テスト、検証、commit、push、PR作成まで完了する。

## Scope

- In: `scripts/codex-task.ps1`の`Invoke-NativeCommand`、host／docker共通呼び出し契約、`codex_exit_code` report経路、`tests/contracts/**`のfocused回帰テスト、標準Run Artifact。
- Out: PR #100のHook実装、Hook logging、`.codex/hooks/**`、`codex-task.sh`、`codex-safe.ps1`、Codex CLI、wrapper再設計、stdout／stderr suppression、全量buffering。

## Assumptions

- deterministic native commandを使うPowerShell contract testを追加し、実Codex CLI／Dockerは不要とするIssueの方針に従う。
- Windowsでは`powershell.exe`、その他の環境では利用可能な`pwsh`を使い、runtimeがない場合はdynamic testを明示的にskipする。
- `Out-Host`でstdoutだけをhostへ出力してsuccess outputから消費し、stderrと`$LASTEXITCODE`の既存契約を保つ。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。Issue本文に目的、スコープ、期待結果、検証、PR条件が指定されている。
- 仮定してよい細部: 既存の`tests/contracts/**`へfocused testを追加し、full wrapperは一時fixtureとfake native commandで検証する。
- 未回答の重要質問: なし。

## Hypotheses

- H1（支持・確認済み）: native stdoutと`return $LASTEXITCODE`が同じPowerShell success streamへ流れ、代入結果が`System.Object[]`になる。
- H2（検証対象）: `& $Command @CommandArgs | Out-Host`でstdoutをuser-visibleに保ち、関数のsuccess outputをexit codeだけにできる。

## Research Plan

- Round 1 Query: AGENTS、PROJECT_CONTEXT、最新ADR／Run、Issue #101、実装／テスト／verify／harnessを確認する。
- Round 2 Query: 修正前最小再現とcandidate probeでsuccess stream、stream visibility、scalar exit codeを確認する。
- Round 3 Query: production修正、deterministic contract test、host report test、host／docker static path、focused／full validationを実行する。
- Exit Criteria:
  - 修正前の`System.Object[]`原因と修正後のscalar returnが実測で説明できる。
  - exit 0／non-zero、stdout／stderr visibility、report JSON、host／docker共通関数の各契約がtest／static evidenceで確認できる。
  - 全必須gateがPASS、または実行不能なものがSKIP／理由付きで記録され、commit／push／OPEN PRを確認できる。

## Approach

- repo mappingと最小再現を先に完了し、実装前に計画を`docs/plans/`へ保存する。
- `Invoke-NativeCommand`のnative invocationだけを最小変更し、関数引数、error preference復元、host／docker呼び出し、終了処理を維持する。
- 実production functionを使うfocused testと、fake native commandを使うwrapper/report testで回帰を固定する。
- focused test、PowerShell verify、contract suite、repository verify、diff／scope／sanitizer、branch safetyの順に確認する。
- 標準フロー: `PLAN -> TASKS -> 実行 -> REPORT -> commit/push/PR`

## Definition of Done

- `Invoke-NativeCommand`の戻り値がstdout混入なしのscalar数値である。
- stdout／stderrがユーザーから確認でき、streaming性を必要以上に変更していない。
- reportの`codex_exit_code`が0／non-zeroともJSON numberで、success／failure判定が維持される。
- host／docker双方が共有関数を使い、non-goalファイルへ差分がない。
- 回帰testと指定validationが実測結果付きで完了し、Run Artifact sanitizerがresidual 0である。
- 指定commitを作成し、指定branchへpushし、main向け非Draft OPEN PRを作成・確認する。

## Risks / Unknowns

- `Out-Host`によるstdout／stderr可視性の差をWindows PowerShell／PowerShell Coreで確認する。
- 実Docker／実Codexを省略するため、docker経路は共有関数の静的確認で補う。deterministic testで不足する具体的問題が出た場合だけ追加調査する。
- Run Artifactの絶対pathはsanitizerで置換・checkする。

## Thinking Log

- 2026-09-04 20:43 JST: 指定branchを確認し、Issue #101、最新ADR、直近Run、harnessを確認した。
- 2026-09-04 20:49 JST: 修正前の最小再現は`result_type=System.Object[]`、`result_count=2`、`result_values=repro-stdout|0`。Issue仮説どおりsuccess stream混在が根本原因であり、実装へ進める。
- 2026-09-04 20:50 JST: `Out-Host`候補はWindows PowerShell／PowerShell Coreでstdout／stderr markerを表示し、exit 0／7とも`System.Int32`・count 1・正しい値を返した。全量bufferingを導入しない最小変更とする。
