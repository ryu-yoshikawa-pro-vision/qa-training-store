# 計画

## 目的

- PR #9 のレビュー指摘と Ubuntu `pwsh` CI 失敗を現行コードで検証し、Codex Run Artifact の Path Sanitization を安全に完成させる。
- Windows PowerShell 5.1 と Linux PowerShell 7 の共通契約、Path境界、書込み安全性、終了処理、ChangedOnly、Artifact整合性をローカルで確認する。

## 対象範囲

- 対象: `scripts/lib/codex-artifact-sanitizer.ps1`、`scripts/sanitize-codex-artifacts.ps1`、`scripts/codex-task.ps1`、Fixture／Contract Test、`.github/workflows/ci.yml`、PR #9 で追加・変更された Run Artifact、Path Sanitization に必要な docs/ADR/History。
- 対象: PR #9 に含まれる Native成果物規約を維持し、共有用成果物と実行機械証跡の保存先、Git追跡状態、関連文書・Run Artifactの整合性を確認する作業。
- 対象外: Branch作成・切替、Commit、Push、Rebase、Merge、PR本文更新、Review thread Resolve、Workflow手動再実行、Remote CI成功の主張、過去Runの一括書換え、BOM保持・Regex cache・Persistent stream化・checkout SHA固定など今回対象外の指摘。

## 前提

- 現在の branch と checkout は PR #9 の head を指しており、既存変更はユーザーの作業として保持する。
- 既知の仕様は UTF-8 without BOM、改行コード維持、対象拡張子限定である。BOM保持要求は現行仕様と矛盾するため採用しない。
- `pwsh` がローカルに存在すれば実行し、存在しない場合は未実行理由を明記する。Remote CI は修正後も Push しないため NOT RUN とする。

## 不明点

- 必ず質問する不透明点: なし。添付指示に必須修正・対象外・Git操作禁止が明記されている。
- 仮定してよい細部: Atomic fallback の失敗注入は小さな可視HelperとFixtureで可能な範囲を検証し、OS依存の強制失敗は構造レビューと残存Path確認で補う。
- 未回答の重要質問: なし。

## 仮説

- H1: Ubuntu Fixture の失敗は Linux 上で `USERPROFILE` が未登録で、Fixture がWindows形式のユーザーホーム配下を`<USER_HOME>`へ置換できないことが原因である。
- H2: PR #9 のレビュー指摘のうち Path境界、Atomic fallback、終了処理、ChangedOnly、invalid UTF-8、Finding再サニタイズ、JSONLは現行コードで再現可能な必須修正である。
- H3: Run Artifact の Subagent／Validation記録と、ユーザーが明示依頼したNative成果物規約は、Path Sanitizationと同じPR内で維持可能な別責務として整合性を確認できる。

## 調査計画

- 第1回の調査: 添付指示、PR #9 全Review thread、最新Actions log、branch baseline、対象コード、対象Run差分を確認する。
- 第2回の調査: read-only subagent のコード／実装／テスト調査を統合し、Fixture・Contract・CI・Run整合性を修正する。
- 終了条件:
  - H1/H2/H3ごとに再現またはコード根拠がある。
  - 必須修正は bounded Repair Loop の iteration として記録される。
  - Windows 5.1／Linux pwsh 7、品質ゲート、Current Run Write+Check の実行範囲が事実と一致する。

## 方針

- 1. BaselineとRemote証跡をRunへ記録する。
- 2. Findingsを`must_fix`／`should_fix`／`defer`／`reject`へ分類し、allowed filesを固定する。
- 3. 共通Sanitizer、CLI、codex-task、Fixture／Contract、CIを最小差分で修正する。
- 4. PR #9対象Runの整合性と日本語／Markdownを修正し、Native成果物規約を保持して保存先と責務を検証する。
- 5. Repair Loop iterationごとに検証・残差・停止判断を記録する。
- 6. 最終RunへSanitizerのWrite＋Checkを実行し、評価とGit statusを更新する。

## 完了条件

- Ubuntu相当の PowerShell 7 Fixture が成功し、Windows PowerShell 5.1 Fixtureも成功する。
- Pathの完全一致／子Pathだけを置換し、Prefixだけ同じ別Pathを変更しない。
- Atomic fallback、invalid UTF-8、Finding content、ChangedOnly、codex-task終了処理が必須契約を満たす。
- Fixture／Contract／Format／Lint／Typecheck／全Contract／Verify／diff check が実行範囲とともに記録される。
- PR #9対象Runの記録が実行事実と一致し、Current Runの Write＋Check が成功する。
- モバイルネイティブ成果物の共有用保存先が`output/mobile-native/`、実行ごとの機械証跡が`.artifacts/native-local/<timestamp>/`として明確に分離される。
- 余計なNative成果物がリポジトリ直下またはGit追跡対象に残らず、Native関連文書・履歴・Run Artifactが実際の変更と一致する。
- Remote CIはPush前のためNOT RUNと明記し、Git操作は行わない。

## リスク／未確定事項

- `gh` CLIが未導入のため Actions log は GitHub connector の取得結果を証跡とし、Remote再実行はしない。
- Atomic fallback の強制失敗はOS差があるため、Backup→Move→復元の構造と安全なFixtureで確認する。
- 既存Runは監査履歴なので削除・一括書換えしない。Native規約はユーザー明示依頼の変更として維持し、必要な事実整合性だけ確認する。

## 判断ログ

- 2026-08-06 19:45 JST: PR #9 head、Review thread 24件、Ubuntu `pwsh` Fixture失敗ログを確認。USERPROFILE/HOME、Atomic fallback、codex-task終了処理、ChangedOnly、invalid UTF-8、JSONL、Finding content、Run整合性が必須修正候補と判断した。
- 2026-08-06 19:45 JST: BOM保持、Regex cache、Persistent stream、checkout SHA固定、git helper共通化、masked line最適化、Docstring coverageは添付指示により今回の修正対象外とした。
- 2026-08-06 21:15 JST: ユーザー訂正により、Native成果物規約をPRスコープ内のIntentionalな変更として再分類した。`output/mobile-native/`は共有用、`.artifacts/native-local/<timestamp>/`は再生成可能な機械証跡とし、関連文書・履歴・Run Artifactを削除せず維持して検証する。
- 2026-08-06 22:35 JST: PR #9修正指示の追加必須項目をiteration 3として反映した。Expo 3 packageをpnpm経由で更新し、`expo install --check`と警告抑制条件付き`expo-doctor@1.17.6`は17/17。観測済みRemoteはPhase 1 success／Native CI failure（更新前のNative Static patch mismatch）で、更新後Remoteの再実行は禁止されているため、Run評価はpassにせずpartialとする。
- 2026-08-06 23:30 JST: 実機Native検証を実施した。Doctor、最終Release APK Build、Install、Smoke、`native-test-control.yaml`は成功したが、Runtime Suiteは5フロー中3成功／2失敗（`native-storefront`／`native-cart`の`native-product-card-product-basic-shirt`未検出）となった。失敗時のスクリーンショット、UI hierarchy、logcat、JUnitを`.artifacts/native-local/20260806-230738-JST/`へ保存し、Runbookの停止条件によりBoundary Suiteは実行していない。実機検証を全体PASSとは扱わず、原因確認・再検証と更新後Remote CIを未完了として残す。

## 2026-08-07 05:30 JST Android Build復旧文書化

- 実機Buildで観測した、外部Virtual Store切替後に`.pnpm-local`のAutolinking／CMake参照が残り、`build.ninja still dirty after 100 tries`となる事象を、Runbook 4.3とTroubleshooting 9へ追記する。
- 復旧順序は、`Prepare`後の`.modules.yaml`／Package Link／Autolinking確認、必要時の明示的Virtual Store再リンク、`expo prebuild --clean --platform android --no-install`による生成状態再作成、Build再実行とする。`-CleanNative`単独を初手にしない。
- `README`から復旧節を参照し、`PROJECT_CONTEXT`と履歴へ実測結果を追記する。生成物、APK、端末固有情報は文書へ保存しない。
- implementation_researcher（read-only）の調査結果を採用した。ADR-0005が詳細をRunbook／Troubleshootingへ委譲済みのため、ADRは変更しない。
- Progress: 100% (19/19)

## 2026-08-07 06:03 JST Native商品カード未検出のローカル切り分け

- 既存の失敗証跡とソースを照合した。Seedには`product-basic-shirt`／`P-0001`が存在し、Native SQLite検索も商品Codeを検索対象にしているため、CI限定のデータ欠落とは直ちに判断しない。
- 端末の標準入力方式はSHV48の`IWnnLanguageSwitcher`であり、過去に記録済みのMaestro ASCII入力不具合と一致した。失敗Hierarchyでは`native-product-card-product-mug`等は見える一方、検索欄のplaceholderが残り、対象カードがない。
- 同じインストール済みAPKでLatinIMEを一時有効化したところ、対象`native-storefront.yaml`はPASSし、公式単体GateもPASS、Runtime Suiteは5/5 PASSとなった。終了後、元の日本語IMEと有効IME一覧を復元した。
- 結論は、ローカルで調査・再検証可能であり、今回の最有力原因はアプリのSeed／Selectorではなく実機IME条件である。標準日本語IMEでの恒久対応は未実装であり、LatinIME切替だけを最終修正とは扱わない。
- Build／Install／Smokeは同一APKで直前にPASS済みかつ今回コード変更なしのため再実行していない。Boundary Suiteは今回の質問の対象外として未実行のまま維持する。
- Progress: 100% (20/20)

## 2026-08-07 06:20 JST Native Maestro入力経路分離の実装計画

- ユーザー合意の方針に基づき、既知商品の主要Storefront／Cart／Persistence Flowから検索入力依存を外し、Product Deep Linkへ切り替える。
- `P-0001`入力、検索実行、`native-product-card-product-basic-shirt`検出は`maestro/native-search.yaml`へ分離する。検索後の商品カード可視化まで残し、検索カバレッジを削除しない。
- ローカルのRuntime／Boundaryの分母は既存の5＋5を維持し、CI（Android／iOS）は検索専用Flowを別Maestro実行として保存・報告する。物理端末では標準IMEがASCII入力を保持しない場合だけLatinIME等を一時使用し、終了後に復元する。
- implementation_researcher（Darwin）は、既存Product Deep LinkがBoundary Flowで利用済みであること、主要4 Flowが同じ検索入力経路を持つこと、CI／Contract更新が必要であることを確認した。test_investigator（Bernoulli）は、検索専用Flowにも`P-0001`から商品カード可視化まで残すべきと指摘した。両方の調査結果を採用する。
- 計画書を[`docs/plans/2026-08-07_062000_native-input-flow-policy.md`](../../docs/plans/2026-08-07_062000_native-input-flow-policy.md)へ保存した。
- Progress: 87% (20/23)

## 2026-08-07 06:55 JST Native入力経路分離の実装・検証結果

- 主要4 FlowをProduct Deep Linkへ切り替え、`maestro/native-search.yaml`を追加した。検索Flowは`P-0001`入力から対象商品カードtestID検出までを保持し、商品名Textの画面外assertは追加しない。
- Android／iOS CIへ検索専用Flowを主要Runtime／Boundaryと別実行として追加し、Native Contractへ主要FlowのIME非依存・検索Flowのカード可視化契約を追加した。
- 初回実機RuntimeでDeep Link直後の商品名assertが画面外判定となったため、商品名assertのみ削除し、既存の商品詳細testIDとVariant `scrollUntilVisible`を維持した。Timeout延長や主要検証の削除は行っていない。
- 修正後の標準IME実機はControl 1/1、Runtime 5/5、Boundary 5/5。LatinIME一時切替の検索専用Flowは1/1。終了後のIMEと有効IME一覧は元へ復元した。
- Format、Lint、Native Contract 30/30、Native test typecheck、diff checkはPASS。全体typecheckは今回変更外の既存6箇所のimplicit-anyでFAILした。Remote CIはPush／Workflow再実行禁止のため未確認。
- Progress: 100% (23/23)
