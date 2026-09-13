# PR #127 Trigger Eval timeout 原因調査計画

## 0. 依頼概要

- 依頼内容: canonical `all` runで24/24 caseが120秒timeoutになった原因を、既存実装とmanual Observation Probeの差分を含めて診断する。
- 背景: runnerはWindowsで`codex.cmd`と`cmd.exe`を経由し、childの`close`を待ってからtimeoutを解除する。`turn.completed`到達とprocess closeの順序が未観測である。
- 期待成果: Host latency、runner lifecycle defect、または別のtransport/process/environment原因を実測証拠で分類し、必要な場合だけ最小修正の次工程へ進める。

## 1. ゴール / 完了条件

- ゴール: canonical runを再実行せず、control queryによる最小限のdiagnostic executionでterminal event・exit・close・timeout・process treeの時系列を確定する。
- 完了条件（DoD）:
  - [x] current runnerのspawn、stdin、stdout、terminal、exit、close、timer、taskkillの挙動を実測する。
  - [x] manual Probeとrunnerのcommand、cwd、`-C`、stdin、shell、実行ファイル、process tree、環境、sandbox、trust、hook条件の差分を列挙する。
  - [x] negative controlをmanual-style / runner-styleで最小限実行し、必要な場合だけpositive controlをrunner-styleで1回実行する。
  - [x] 120秒以前にterminal eventがstdoutへ到達したかを判定する。
  - [x] 調査結果を既存active Runの`REPORT.md`へappend-onlyで記録する。
  - [x] evaluator defectが確認された場合だけ、Planに従い最小修正・validation・commit・pushへ進む。確認されない場合はcanonical runを再実行しない。

## 2. 現状理解と前提

- Current understanding:
  - runnerの`executeCodex`はstdoutをincrementalに受信しているが、terminal eventをclose前に確定せず、`close` callback内でだけstdoutをparseする。
  - timeout timerはspawn後に開始し、`close`までclearされない。timeout後はWindowsでchild PIDに対して`taskkill /t /f`を実行する。
  - 既存manual Probeはsame Codex protocolで`turn.completed`まで到達したが、runnerと同一process launch shapeか、terminal受信時刻とclose時刻の差は未確定である。
  - canonical `all` artifactは全caseを`unobservable/timeout`と記録しているが、terminal event到達時刻は保存していない。
- Assumptions:
  - target root、trust、hook logger、routing source SHAは既存Probeと同じ準備済み環境を使用する。
  - diagnostic controlはcanonical dataset caseではなく、Plan指定のraw negative controlを優先する。
  - diagnostic用の一時ログは`.artifacts`へ置けるが、Run Artifactへは必要な要約だけを記録する。
- Non-goals:
  - canonical `all`、dataset case、unobservable caseの再実行。
  - dataset/query/Skill description/`AGENTS.md` routing contractの変更。
  - timeout値の緩和、retry framework、process manager、Probe専用runnerの恒久追加。
  - 原因確定前のresult schema変更。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。ユーザーがdiagnostic control、停止条件、許可された修正範囲を指定済み。
- 仮定してよい細部: manual-styleとcurrent runner-styleを比較するため、同じnegative queryを各launch shapeで1回ずつ使う。これはcanonical caseの再評価ではない。
- 未回答の重要質問: なし。

## 4. 影響範囲

- Impacted areas:
  - 読み取り: `scripts/evals/run-skill-trigger-evals.ts`、既存Observation Probe、canonical invalid artifact、Codex/Hook実行環境。
  - 記録: `.codex/runs/20260906-191724-JST/REPORT.md`、必要に応じて`TASKS.md`。
  - 条件付き変更: evaluator lifecycle defectが実証された場合のみrunner sourceと関連testを最小修正する。
- Files to inspect:
  - `scripts/evals/run-skill-trigger-evals.ts`
  - `.codex/runs/20260906-191724-JST/observation-probe.md`
  - `.codex/runs/20260906-191724-JST/trigger-eval-baseline.json`
  - `.codex/runs/20260906-191724-JST/REPORT.md`
  - `.codex/runs/20260906-191724-JST/TASKS.md`

## 5. 変更方針

- Change strategy:
  1. current branch/PR、runner実装、既存Probe、artifactを確認する。
  2. diagnostic用の一時観測だけを用意し、manual-styleとrunner-styleのprocess/event時刻を収集する。
  3. 120秒前terminal到達、close遅延、timeout時process treeを根拠に原因分類する。
  4. lifecycle defectの場合は、terminal event受信をtimeout判定の入力にする最小修正の要否を確定し、deterministic/repository/Skill/verify/Probeを再確認する。
  5. Host latencyまたは別environment原因の場合はsourceを変更せず、canonical runを再実行せず、blockerとして記録する。
- 実行タスク:
  - [ ] 1. diagnostic計画とactive Run checkpointを保存する。
  - [ ] 2. negative controlのmanual-style / runner-styleを時刻付きで実測する。
  - [ ] 3. 必要ならpositive controlをrunner-styleで1回実測する。
  - [ ] 4. process tree、hook、trust、transport条件を比較して原因を分類する。
  - [ ] 5. 必要な場合だけ最小修正・validation・commit・pushを行う。
  - [ ] 6. REPORTと最終報告へ根拠を反映する。

## 6. 検証方法

- Validation plan:
  - 診断: stdout JSONLを受信時刻付きで記録し、terminal eventを`exit`/`close`/timeoutと独立に確定する。
  - process: diagnostic child PIDを基点に、timeout直前または終了時点の`cmd.exe`、`node`、Codex、hook関連processを確認する。
  - 修正時のみ: `pnpm run eval:skills:trigger:validate`、`pnpm run test:repository`、`pnpm run validate:skills`、`pnpm run verify`、manual Observation Probeを実行する。
- 成功判定:
  - Case A/B/Cのいずれかを、具体的なtimestampとprocess状態で分類できる。
  - canonical `all`を再実行せず、原因に応じた次の対応を決定できる。

## 7. リスクと未解決論点

- Risks:
  - diagnostic execution自体が120秒を超える可能性があるため、controlは指定queryに限定し、case retryと混同しない。
  - Codex processがterminal後もpipeを保持する場合、diagnostic childだけを対象に終了処理し、他processへ作用させない。
  - raw stdout/hookログにローカルpathや不要な情報が含まれ得るため、Run Artifactにはsanitized summaryだけを保存する。
- Open questions:
  - 解決済み。runner-style positiveではterminal eventが120秒以内に到達せず、timeout時点で`codex.exe`が継続していたためCase Bと分類した。

## 8. 成果物

- 変更ファイル:
  - 原則なし。lifecycle defectが実証された場合のみ、最小修正対象を確定する。
- 付随ドキュメント:
  - 本計画、既存active Runのappend-only `REPORT.md` checkpoint。

## 9. 備考

- canonical `all`は原因確定前に再実行しない。
- 結果が悪いことを理由にrouting、query、timeout、観測契約を都合よく変更しない。
