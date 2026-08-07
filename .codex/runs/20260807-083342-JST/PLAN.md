# Plan

## Objective
- PR #9 再修正指示に基づき、Codex Run Artifactサニタイザーの行分割・Finding出力漏えいを修正し、検索から商品カード経由で商品詳細へ遷移するMaestroカバレッジを回復する。
- 指定されたRun Artifactをサニタイズし、Remote CI未実行の事実を保ったままローカル検証結果を記録する。

## Scope
- In: `scripts/lib/codex-artifact-sanitizer.ps1`、必要なサニタイズ入口/診断、PowerShell Fixture、Sanitization/Native Maestro Contract、`maestro/native-search.yaml`、品質ゲート方針の正本と訂正履歴、指定Run Artifact。
- Out: Branch/Commit/Push/PR/Workflow再実行、過去Runの削除、無関係な大規模リファクタ、アプリ本体の仕様変更、CIの手動再実行。

## Assumptions
- 指示本文に示されたPhase 1 CI failure、Native CI in_progress、Fixture 39 contracts PASSを既知のレビュー提供情報として扱う。
- Remote CIはローカルから再実行せず、今回のRunではNOT RUNとして記録する。
- `<REPO_ROOT>` と `<PNPM_VIRTUAL_STORE>` は既知Aliasとしてサニタイズ対象に含める。

## Questions / Ambiguity
- 必ず質問する不透明点: なし。指示本文で修正対象と停止条件が指定されている。
- 仮定してよい細部: 既存のOverlap契約とSchemaを確認し、既存の公開挙動を壊さない最小実装を採用する。
- 未回答の重要質問: なし。Remote CIの最終結果だけはPush後確認事項として残す。

## Hypotheses
- H1: PowerShellの負の`-split`指定が、改行を分割せずFindingのline_numberとContentを壊している。
- H2: Finding出力が元行を再利用しているため、パスの前後や空白を含むパスの残部が診断ログへ漏れる。
- H3: `native-search.yaml`のカードタップと詳細画面待機が欠落しており、検索ユーザージャーニーのContractも不足している。
- H4: 品質ゲート方針は因果関係を条件に追加修正を許可するよう明文化し、過去の判断記録は新規訂正履歴で補足する必要がある。

## Research Plan
- Round 1 Query: 指定ファイルの現在実装、既存Fixture/Contract、CIのChanged Artifact Check、Maestro Flow、Schemaを突き合わせる。
- Round 2 Query: 最小修正後にPowerShell 5.1/7、Focused Contract、Native Static相当、全体Verify、サニタイズ冪等性を検証する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach
- どう進めるか（高レベル手順）: findingsを`must_fix`/`should_fix`/`defer`へ分類し、許可ファイルを固定する。実装は行分割Helperと固定Redactionを共有化し、Fixtureで行番号・漏えい・改行形式を直接検証する。Maestro検索FlowとContractを更新し、文書・Run Artifactを実態に合わせる。各iterationで検証と残差を記録し、同一失敗やscope violationが出たら停止する。
- 標準フロー: `PLAN -> repo調査 -> TASKS -> 実行 -> REPORT`

## Definition of Done
- `-split "`n", -1`が残らず、LF/CRLF/CRの行番号と固定RedactionがFixtureで検証できる。
- 指定Run ArtifactのAlias残存がなく、JSON/JSONLがParse可能で、2回目のWrite+Checkが冪等になる。
- `native-search.yaml`がカードをタップし商品詳細を待機し、Contractがその経路を保証する。
- 品質ゲート方針が因果関係/検証不可欠性を条件にし、無関係な問題は別対応へ記録する。
- ローカル必須検証を実行し、修正対象のゲートがPASSし、環境依存の警告とRemote Phase 1/Native CIのNOT RUNを明記する。

## Risks / Unknowns
- 既存Runの履歴を変更するため、Write対象を指示されたRunに限定し、削除・一括日本語化を行わない。
- PowerShell 5.1/7の実行環境差が残る可能性があるため、両方でParser/Fixtureを実行する。
- 実機/Remote CI結果はローカル修正だけでは証明できないため、未確認として明示する。

## Thinking Log
- 2026-08-07 08:33 JST: 新規Repair Runを作成。HEADとBranchは指示本文の確認時点と一致。既存Runは削除せず、指定されたRunだけをWrite+Check対象にする。
- 2026-08-07 08:33 JST: 今回の品質ゲート方針は「範囲外なら安全なら直す」ではなく、現在差分との因果関係または正しい検証に不可欠かを条件にする方針へ訂正する。
- 2026-08-07 09:11 JST: Native Static相当は生成物、format、lint、typecheck、Native Jest、Repository／Contract、route、EAS、Production BundleをPASSした。Expo Doctorだけは`expo install --check`とSDK bundled manifestの一致を確認したうえで、project npm configに関連する環境依存1件として残した。
- 2026-08-07 09:15 JST: 標準日本語IMEの検索入力失敗はPASS扱いせず、LatinIME条件で検索→カード→詳細を1/1確認し、IMEを復元した。Remote再実行を行わず、`partial`評価で停止する。
