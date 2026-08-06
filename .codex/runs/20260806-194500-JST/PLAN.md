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

- H1: Ubuntu Fixture の失敗は Linux 上で `USERPROFILE` が未登録で、Fixture が Windows形式 `C:\Users\...` を `<USER_HOME>`へ置換できないことが原因である。
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
