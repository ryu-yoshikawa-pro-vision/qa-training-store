# Plan

## Objective

- PR #16のレビュー指示に基づき、Agentic QAのScored isolation、Preparation、Evidence、Scoring、Benchmark、Spec Validatorをfail-close化する。

## Scope

- In: P0/P1と必須P2の契約・実行経路・テスト・教材・Normative Spec・Run Artifact。
- Out: Product Behavior、Application SourceへのChallenge Patch適用、Git/PR操作、upload-artifact単独SHA pin。

## Assumptions

- LLM/model-backed Official Scored Runは基盤不足のため未実行とし、contract fixtureは正式Scoringから除外する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: Runtime handleはPreparation callbackへ渡し、Artifactには相対証跡だけを保存する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 固定値を実測結果と証跡へ置換すれば、失敗時に正式Scoringへ進まない契約を成立できる。
- H2: 共有Comparator/CLI/Schema helperを先に確定すれば、Producer/Validatorの不一致を防げる。

## Research Plan

- Round 1 Query: P0/P1 CodeRabbit指摘を現HEADと添付指示へ照合する。
- Round 2 Query: 修正後の壊れた入力テスト、3 Challenge Preparation、全Quality Gateを確認する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach

- 共有Contract/helper → P0実行経路 → P1/P2 validator/docs → negative tests → Runtime/全Gate → scope/sanitizerの順に修正する。
- 標準フロー: `PLAN -> TASKS -> 実行 -> REPORT`

## Definition of Done

- P0/P1必須指示を実装し、壊れた入力がfail-close、3 Challenge preparation、指定validation、Run Artifact監査がPASSする。未実行model-backed runはPASS扱いしない。

## Risks / Unknowns

- Schema必須化によるfixture破壊、runtime cleanup漏れ、Windows改行差分を対象テストとscope監査で検知する。

## Thinking Log

- 思考や判断の理由はここに逐次追記する（作業中に更新）。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。

- 既存Run `20260810-061558-JST` は前タスク完了済み。今回の修正は新Run `20260810-130321-JST` で記録し、指示された旧Runへは追補のみ行う。
- 2026-08-10 15:27 JST: 追加レビューでは、policyとActual Tool Scope、narrativeとEvidence artifact、local fixtureとOfficial Scored Runを別境界として維持することを確認した。未計測Scope／未実行Official RunはPASSへ昇格しない。
- 2026-08-10 18:14 JST: 最終指示のmust_fixをForbidden Probe完全性とAgentic QA run_id固定の2件に限定した。ProbeはTool Profileとの集合一致をRunner／Preparation／Evaluatorで共有検証し、run_idは`YYYYMMDD-HHMMSS-JST`へ固定する。Product／Native／Maestro／仕様／低優先度レビュー項目は変更対象外とした。
- 2026-08-10 19:39 JST: Trust Boundary残課題の4件をmust_fixとして追加修正した。Forbidden Enumの`.options`からCanonical Setを導出し、Tool Profile／Probeを共通Schemaで検証する。Evaluatorは実Profile file bytesのSHA-256を計算してFrozen Runner Profileと比較し、Runner Sessionのprior ID不変条件とunmeasured testのProbe復元を固定する。Product／Native／Maestro／仕様は変更対象外のまま維持した。
- 2026-08-10 21:29 JST: Architecture correctionをmust_fixとして追加した。Primary QA ExecutorをCoding Agent + Exploratory QA Skillに固定し、HarnessはDeterministic supporting layerへ限定する。`prepareChallenge()`のAgent callback／runtime handoffを削除し、Runtime handleを内部Prepared Web preparation用へ限定した。Contract Fixtureを`run-contract-fixture.ts`へrenameし、Official Scored Capability不足はCurrent Coding Agent Runtime／Hostの証拠不足としてBLOCKEDに維持する。Product／Native／Maestro／Specification内容は変更しない。
- 2026-08-10 23:13 JST: CI failureの一次原因は、disposable sourceへpackage単位で依存を重ねたためpnpmのtransitive topology（`tsx -> esbuild`）が欠落したことだった。root `node_modules`全体をjunction／symlinkで準備源へ公開し、Expo Routerの実パス解決には`EXPO_ROUTER_APP_ROOT`と`--preserve-symlinks-main`を渡した。手動buildで2296 modules／routesを確認後、実Preparationを含むfocused testと`pnpm run verify`で再検証した。
- 2026-08-10 23:13 JST: Normal／Grayはcurrent runのcharterが無い場合にCoding Agentがscopeからbounded charterを生成し、deterministic validation後にのみ実行する契約へ整理した。共有`exploration_budget`を既存charterへ移行し、BEFORE snapshotを最初のruntime interaction前、candidate findingsをAFTER snapshot前、追加Source diff 0をfinalize前に固定した。Runner Profileはmanifest metadataとして許容しつつcanonical Benchmark Revision inputから除外した。
- 2026-08-11 06:14 JST: CIのExpo Doctor failureは、Expo SDK 57のrequired patch versionとpackage.json／override／lockfileの不一致が一次原因と判断した。7件の直接依存と`expo-constants` overrideを同じpatchへ更新し、`pnpm install --lockfile-only --ignore-scripts`後に実installを行う。更新後の通常Windows doctorはignored `.npmrc`由来のnpm warningをFailure扱いするため、CI checkoutに存在しない環境差分として分離し、`npm_config_loglevel=error`のCI相当実行と`pnpm exec expo install --check`で依存契約を確認する。以後、全品質ゲート／テストと範囲外Failure調査を完了条件へ含める。
- 2026-08-11 07:08 JST: `pnpm run verify`の再検証では、初回のNative Jest 5秒timeoutと、次回のDeterministic Preparation 180秒timeoutをFailureとして調査した。対象単独／全Native／focused Preparation／全Contractの再検証で再現しなかったため、ソース回帰ではなくホスト資源・並列実行由来のtransient候補と分類する。ただしFailureを無視せず、artifactと今回起動プロセスを確認してから再検証した。CI相当Web E2E、UI Review、Production artifact smoke、Native static gateも追加で実行し、残るローカルNative Build／実機FlowはRunbookのDoctor／preflight後に実行する。
- 2026-08-11 07:38 JST: Android実機のAutomation Release APK、Install、Smoke、Gate 1、Runtime 5/5、Boundary 5/5はPASSした。独立Search FlowだけがFailureし、MaestroのinputText完了後もSHV48標準IMEでは`P-0001`が検索結果へ反映されず、Hierarchyはlow-stock／mugのみだった。検索入力専用Flowの既知IME条件と一致するため`DEVICE_FAILURE`／environment residualとして切り分け、LatinIMEへ一時切替して同じFlowを一度だけ再検証する。成功後は元のIMEと有効IME集合を復元し、Purchase／Reviewを実行する。
- 2026-08-11 07:43 JST: Review Flowは対象review buttonの存在をHierarchy／Screenshotで確認できるにもかかわらず、`scrollUntilVisible`がFailureした。これはorder／review dataの不在ではなく、Maestroのscroll可視判定のraceまたはWindows session lockの可能性がある。新しいartifactを得るため同一条件を別RunIdで一度だけ再実行し、再現する場合は追加変更せず停止する。
- 2026-08-11 07:48 JST: Review Flowは同じFailureを2回再現したが、対象buttonはHierarchyにあり座標tapでReview画面へ遷移できた。Expo patch更新後のNative CIで再発しうるため、子buttonを直接scroll対象にする脆い境界を、review item containerをscroll対象にしてから同じ子buttonをtapする最小Flow修正へ変更する。Assertion／待機／Review内容は維持し、Flow単体、Maestro contract、全品質ゲートを再実行する。
- 2026-08-11 07:52 JST: 親container対象の修正Flowも`No visible element found`でFailureしたが、最終Hierarchyでは親container（`[48,767][1032,1700]`）と子button（`[99,1517][981,1649]`）が完全に表示され、Screenshotにもボタンが描画されていた。親／子のtestIDやreviewable data欠落ではない。Maestroの可視率100%／centerElement条件またはスクロール判定の境界を仮説とし、Flowのscroll条件を緩める1回限りの検証へ進む。これで失敗した場合は追加再試行を止め、残差を明示する。
- 2026-08-11 07:56 JST: 可視率／中央寄せを除去したFlowはscroll stepを通過したが、親containerの一部表示で停止し、子buttonは画面外へ残ったため`tapOn`がFailureした。Flow工程はbounded回数を超え、これ以上のMaestro条件調整は無目的再試行になるため停止する。修正Flowは採用せずbaselineへ復元し、Review gateは`NOT PASS / TEST_FAILURE候補`として記録する。Expo依存修正のCI相当品質ゲートと全体verifyの結果は分離して報告する。
