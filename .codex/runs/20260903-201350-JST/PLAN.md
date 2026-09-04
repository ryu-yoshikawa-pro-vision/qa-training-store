# Plan

## Objective

- Codex CLI 0.153.0への更新後に発生したHook症状を、script単体／設定launcher／実Codex runtimeの3境界で分離し、Primary／Secondary CauseをEvidence付きで確定する。
- Repository側の原因だけを必要最小限で修正し、契約回帰テスト、実runtime再確認、全必須検証、commit／push／main向けOPEN PRまで完了する。Upstream原因だけなら不要なworkaroundを追加しない。

## Scope

- In: `.codex/config.toml`、Hook scripts、Hook contract tests、`scripts/verify*`、Hook関連docs／ADR／Run Artifact、Windows CLIの現行実行経路、必要な公式Codex／upstream source・issue。
- Out: Product code、Hook無効化、PreToolUse security policyの弱体化、sandbox緩和、無関係なcleanup、PR #100の同一修正の再実装。

## Assumptions

- Windows上のinstalled Codex CLIをprimary surfaceとし、Desktop／IDEは実行状態と再現可否を別に記録する。
- 現在の実装はPR #100後のHEADをbaselineとし、`0.152.1`をlast-known-good候補として比較するが、過去報告を今回の原因とは仮定しない。
- Hook payload、prompt本文、credential、生ログ全文、ローカル絶対Pathはdurable artifactへ保存しない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。現環境でCLI、launcher、直接stdin probeを実行できる。
- 仮定してよい細部: infrastructure probeのCharter roleはoperator、platformはweb相当のCLI hostとして現行QA schemaへ記録する。
- 未回答の重要質問: 0.153.0の実runtimeでどのevent／tool pathが発火し、どの時点で壊れるか。

## Hypotheses

- H1: 0.153.0でWindows `cmd.exe /C`、PowerShell `-Command`、stdin／stdout／cwd／exit forwardingが変わり、PR #100後のquote-free launcherにも回帰がある。
- H2: project trustまたはconfig layerの読み込みが変わり、Hookが未spawn／skipになっている。
- H3: `Bash` matcher、`exec_command`／`functions.exec`／Code Modeのtool routing、またはpayload contractが変わった。
- H4: launcherは起動するが、loggerのcurrent payload validationまたは`.codex/logs`／fallback I/Oが失敗している。
- H5: CLIは正常で、Desktop／IDE integrationまたは`codex-task` wrapperの終了処理だけが問題である。

## Research Plan

- Round 1 Query: 現HEADのconfig／scripts／tests／ADR／PR #100・#81・#76・直近Runと、installed CLIのdoctor／features／help／trust/config状態を固定する。
- Round 2 Query: 公式Hook contract、0.152.1→0.153.0 changelog、upstream runner source／Windows・trust・lifecycle・Code Mode issueを照合し、A→B→C probeを実行する。
- Round 3 Query: 最小修正の要否を原因分類とbaseline diffで判断し、必要時だけtest→focused validation→full gate→runtime再確認→Git/PRへ進む。
- Exit Criteria:
  - 各調査対象eventの発火／失敗／未実行／side effect／latencyを可能な範囲でA/B/Cに分類する。
  - PR #100の原因と今回の0.153.0挙動を分離し、Primary／Secondary Causeを根拠付きで記録する。
  - 修正時はsecurity policyを維持し、回帰テストと必須validationがPASSする。修正不要時はその理由とupstream対応を記録する。

## Approach

1. Run、branch、environment、features、trust、config loading、既存差分を記録する。
2. repo mappingと公式／upstream contractを確認し、現行Hook全eventを列挙する。
3. bounded QA CharterとBEFORE snapshotを作成してから、A（script）→B（launcher）→C（runtime）の順にprobeする。
4. Evidenceをredacted raw artifactへ置き、failureの最初の異常と派生症状を分離する。
5. 必要最小限の変更だけをapply_patchで行い、contract test／syntax／launcher／verify／runtimeを段階的に検証する。
6. sanitized Run Artifactとdurable reportを確定し、branch safety check後にcommit／push／PRを行う。

## Definition of Done

- 現在のCodex version、surface、trust/config loading、OS／toolchainが記録されている。
- script／configured launcher／actual runtimeの境界別結果、対象event、payload／stdout／stderr／exit／timeout／side effectがEvidence付きで説明できる。
- Root Cause分類、PR #100／#81／#76との関係、公式仕様・upstream issueとの関係、remaining risksがdurable reportにある。
- 修正時は変更が最小で、PreToolUse policyが弱くなく、回帰test・focused/full validation・実Codex経路確認が済み、無関係なProduct code差分がない。
- repository修正が必要なら、今回の変更だけが指定branchからcommitされ、pushされ、日本語のOPEN PRが作成されている。

## Risks / Unknowns

- `codex exec`やDesktop／IDEがHook statusとrepository JSONLを同時に永続化しない場合がある。status、spawn、I/Oを別Evidenceとして扱う。
- project trustはCodex state側の設定であり、未信頼なら無理に永続変更せず、trust済み経路と明示的なbypass probeを区別する。
- Hook payloadは機密情報を含み得るため、raw outputは`.artifacts/`に限定し、durable artifactは要約とredacted referenceだけにする。
- GitHub API／PR操作やupstream source取得が認証・ネットワークで阻害された場合は、コマンド結果を記録して停止理由と次アクションを明記する。

## Thinking Log

- 2026-09-03 20:13 JST: branchは指定どおり、working treeはclean、HEADは現mainと同じ。CLIは`0.153.0`、Desktopは停止中。
- 2026-09-03 20:13 JST: 公式Docsは現行でもinline `config.toml`、`command_windows`、project trust、`Bash` matcher、`PostToolUse`／`Stop`／`SubagentStop`の契約を支持している。まず実payload／実runnerを測り、config変更を後回しにする。
