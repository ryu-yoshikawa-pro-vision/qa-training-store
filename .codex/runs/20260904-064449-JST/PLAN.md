# Plan

## Objective

- 直前のCodex sessionで表示された`hook exited with code 1`について、event、handler、source/config layer、実command、cwd、A/B/C境界、stdout／stderr／duration／side effectをEvidence付きで特定する。
- 既存PR #106の5→10秒変更とは独立に、repository bug、config／trust、Codex runtime／integration、sandbox、payload／matcher、performance等を分類する。原因確定前はコード・config・PR本文を変更しない。

## Scope

- In: Windowsのinstalled Codex CLI、CLI runtime／diagnostics／logs、project・user・managed・plugin・executor-scopedのHook source inventory、現行6 event、`.codex/config.toml`、既存Hook scriptの直接probe、configured launcherの同一shell／cwd probe、可能な最小実Codex runtime probe、PR #106と既存run／ADRの相関。
- Out: Product code、user configの変更、Hook無効化、sandbox緩和、security policy／matcher変更、timeoutの追加延長、async化、PR #106の完了断定、原因確定前の修正。

## Assumptions

- 現在のprimary surfaceはWindows上のCodex CLI `0.153.0`候補だが、毎回実測して確定する。Desktop／IDEは実行状態と証跡の有無を分離して記録する。
- ユーザーが見た文言にはevent／timestamp／session idがない可能性がある。その場合は、直近の保存ログと再現probeで相関限界を明示し、推測でeventを断定しない。
- raw prompt、credential、token、機密なstdin全文は保存せず、`.artifacts/`にはredactedな要約と数値だけを置く。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。現環境のread-only診断と最小runtime probeで調査を進める。
- 仮定してよい細部: QA charterのplatformは既存契約に合わせ`web`、実体はWindows CLI hostとして記録する。既存のPR #106変更はbaselineとして保持する。
- 未回答の重要質問: genericなUI文言を返したhandlerと、repository project-scoped Hookか別layer Hookか。直近session証跡で解消できない場合は再現結果と相関限界を残す。

## Hypotheses

- H1: PR #106のproject-scoped loggingまたはPreToolUse launcherが、実Codex runtimeでexit 1を返した。
- H2: user／managed／plugin／executor-scopedなど別layerのHookが同じUI文言を出し、project Hookのsuccess contractとは無関係に失敗した。
- H3: Stop系などのruntime lifecycle／trust／config loading経路がHookをskip・spawn failure・exit 1へ変換した。
- H4: logger／fallback／Git root／Node／filesystemの実failureがlauncher fail-soft boundaryを越えた。timeoutとは別のprocess exitである。
- H5: 調査環境では直前sessionを再現できず、保存されているのはUI要約だけでevent identityが欠けている。

## Research Plan

- Round 1 Query: branch／PR／environment、official Hook contract、project context／ADR／既存run、Codex doctor／features／config loading、全Hook sourceと直近runtime／repository logをredactedに固定する。
- Round 2 Query: 失敗候補をA（script単体）→B（configured command、同一PowerShell／cmd／cwd）→C（実Codex runtime）の順に、正常・logger missing・Node nonzero・Git root解決失敗・PreToolUse allow／deny／malformed／launcher failureで分離する。
- Round 3 Query: 最初のexit 1 boundaryとsourceを確定し、repository changeの要否を判断する。repo原因なら回帰testを先に作るが、原因確定までは変更しない。外部原因ならコード・PRを変更せず運用対応を記録する。
- Exit Criteria:
  - 失敗したhandlerをevent／source／layer／command／cwdまで特定できる、または保存証跡不足を再現・調査限界としてEvidence付きで説明できる。
  - A/B/Cで初めてexit 1となる境界、stdout／stderr／duration／side effect、timeout／deny／skipとの区別が記録されている。
  - Primary／Secondary Cause、PR #106との因果関係、修正要否が決まり、未検証リスクに次アクションがある。

## Approach

- このRunを初期化し、Charter・BEFORE snapshot・既存artifact参照を固定する。config layerと直近ログを先に調べ、redacted evidenceを保存してからA→B→C probeを実行する。
- 原因確定後にのみ、必要ならtest→最小修正→focused validation→runtime再確認へ進む。不要ならworking treeを変更しない。
- 標準フロー: `PLAN -> Web検索(不足知識) -> TASKS -> 実行 -> REPORT`

## Definition of Done

- event、handler、source、config layer、command、cwd、runtime surface、exit 1の直接理由をEvidence付きで説明できる。
- logging各ケースとPreToolUseのexit semantics、timeout／spawn failure／deny／trust skip／side effect／UI statusを混同せず分類できる。
- PR #106との因果関係を、直前timeout変更のdiffと新しい再現結果に基づいて判定し、完了扱いを保留または復帰する。
- repository原因の場合のみ必要最小限のtest／修正・validation・commit／push／PR更新まで完了し、外部原因ならコード・PRを不要に変更しない。

## Risks / Unknowns

- Codex UIがevent／handler／stderrを保存せず、直前sessionの相関が不可能な場合がある。再現probeとsource読解を分け、確定と未確定を明示する。
- user／managed configの内容には秘密情報があり得るため、存在・hash・Hook metadataのみを記録し、全文やtokenはartifact化しない。
- Stop/SubagentStopの終了raceは最終回答直後の表示と相関し得るが、時系列だけでeventを断定しない。

## Thinking Log

- 思考や判断の理由はここに逐次追記する（作業中に更新）。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。
- 2026-09-04 JST: ユーザー報告は`hook exited with code 1`だけであり、timeout変更後の時系列は因果Evidenceではない。まずidentity／layer／A-B-C境界を確定する。
- 2026-09-04 JST: 現行project HookのA／B／C probeでは、`PreToolUse`を含む6 eventに`exit 1`は再現しなかった。logging 5 eventの異常fixtureも最終exit `0`、PreToolUseのmalformed inputは契約どおり`2`、denyは構造化denyを返す`0`である。
- 2026-09-04 JST: user configにはproject Hookとは別に`notify`があり、現行CLI sourceでは`AfterAgent`の`legacy_notify`としてpayloadをargv末尾へ渡す。実helperは通常payloadではexit `0`だが、約39,970 bytesのargvでWindows `ENAMETOOLONG`（DB記録では`os error 206`）を再現した。これは有力な別経路だが、literal `hook exited with code 1`との同一性は証明しない。
- 2026-09-04 JST: 直前TUIの保存rollout／thread historyにはHook item、event、handler id、stdout、stderr、exit codeが残っていない。一方、対応する`codex.exe`は20:02–20:05 JSTに起動し、PR #106のconfig変更は22:16以降だった。stale config／trust snapshotは追加候補として、再起動後の新規sessionで比較する。
- 2026-09-04 JST: 現時点でrepository source／config／security policy／PR本文は変更しない。UIの`code 1`をStopまたはlegacy notifyと断定せず、次の実sessionでidentity evidenceを採取する。
