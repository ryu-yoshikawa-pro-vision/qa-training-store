# 仕様書と Agentic QA

> 参考資料: この文書はPart 1の必須範囲には含めません。Agentic QAを必須カリキュラムへ混在させず、必須のPart 1では [`09_part1-capstone.md`](./09_part1-capstone.md) を使用します。

## 到達目標

- 正式な仕様書、補助ドキュメント、実行可能な正本ソースコードの役割と責務を区別できる。
- `BR` / `AC` をリスク、テストケース、自動テストへと接続し、変更発生時にどの判断基準を再確認すべきか説明できる。
- Normal、Gray-box、Black-box Scored の各モードにおける変更境界と、カバレッジのSSOT（信頼できる唯一の情報源）を適切に選択できる。
- チャーター、判断基準、単一不具合指摘（Atomic Finding）、実行記録、偽陽性（False Positive）の判定、リグレッションテストへの還元を一つのQA結果としてまとめられる。
- 新規セッション（Fresh Session）、許可ツールリスト（Positive Tool Allowlist）、禁止機能検査（Forbidden Capability Probe）、受講者向け配布物（Bundle）、講師専用資料の意義を説明できる。
- JSON + Zod によるスキーマ契約、ベンチマークリビジョン／識別情報、Runnerプロファイル／バジェット、および評価のFail-close条件を正しく検証できる。

Agentic QAの主なエントリーポイントは、コーディングエージェント（Coding Agent）と探索的QAスキル（Exploratory QA Skill）の組み合わせです。コーディングエージェントが仕様書（Specification）を読み解き、リスクベースでランタイム環境を探索しながら、Playwright-MCPやMaestro-MCPなどのランタイム機能を用いて実行記録と単一の不具合指摘（Atomic Finding）を作成します。`scripts/agentic-qa/**` はコーディングエージェントを起動するためのスクリプトランナーではなく、決定論的（Deterministic）な準備・検証・環境隔離の確認・成果物の完全性担保・評価・採点を支えるテストハーネスです。

## 1. Specification（仕様書）を読む

最初に `docs/spec/README.md` から対象機能（Feature）へと進み、正式なプロダクトスコープ、ロール、状態遷移（State）、UI/UX、機能仕様を確認します。各機能の仕様書は、以下の5つのセクションを固定順で構成されています。

1. Purpose / Scope（目的・スコープ）
2. Business Rules（ビジネスルール）
3. UI / Behavior Contract（UI・振る舞い契約）
4. Acceptance Criteria（受け入れ条件）
5. 実行可能な正本ソース

`BR-AREA-NNN` はビジネスルール、`AC-AREA-NNN` は受け入れ可能な観測条件を表します。ACに記載された `Related BR` を起点としてリスクを洗い出し、テストケースの前提条件（Precondition）・操作手順（Action）・期待結果（Expected）・実行記録を設計した上で、PlaywrightやMaestroによる自動テストへ落とし込みます。仕様書に明記されていない独自の期待値を勝手に判断基準へ追加してはならず、既知の動作差分（Known Deviation）または未解決の仕様課題（Unresolved Specification）として明確に切り離します。

## 2. Agentic QAの三つのMode

| Mode | カバレッジの正本（SSOT） | 変更境界 | 主な用途 |
|---|---|---|---|
| Normal | `qa-charter.json` | ソース作業ツリーは読み取り専用 | 仕様駆動のWeb／ネイティブアプリの観察・検証 |
| Gray-box | `qa-charter.json` | 読み取り専用 ＋ 許可されたシードデータ／テスト制御／限定ログ | 不具合の原因候補を絞り込む探索 |
| Black-box Scored | `challenge.json.required_coverage` | 隔離されたルートディレクトリ（isolated root）のみ | 受講者向けに安全化された入力を用いた、比較・採点可能な探索 |

NormalモードおよびGray-boxモードであっても、`.codex/runs/<run_id>/` や `.artifacts/` への実行記録の保存は許可されます。`working-tree-snapshot.ts` を用いて同一形式の実行前後のスナップショットを取得し、比較結果の `passed=true` かつ `additional_source_diff_count=0`（ソースコードへの差分がないこと）を確認した上で指摘事項（Findings）を確定します。なお、Black-boxモードにおける読み取り専用設定は、それ単体では完全なソースコード隔離（Source Isolation）を意味しません。Runnerには `learner-spec/`、`runbook/`、`challenge/` のみを渡すように制限します。

通常の「Scenario ShopをQAしてください」といった依頼にはNormalモードを使用します。Black-box Scoredモードで必要となる新規のコーディングエージェントセッション（Fresh Coding Agent Session）、信頼された識別情報（trusted identity）、ツールの分離（Tool Isolation）、実際のツールスコープ（Actual Tool Scope）は、エージェント実行環境やホスト（Agent Runtime / Host）が提供する機能であり、リポジトリ内のハーネスが独自に生成するものではありません。

Playwright MCPまたは同等の制約されたブラウザツールでは、対象オリジンへのページ遷移（Navigate）、Click / Fill / Select / Scrollなどの基本操作、およびDOM・アクセシビリティツリー・スクリーンショット・URLの観察機能のみを公開します。ブラウザ内での任意のコード実行（evaluate）、JavaScriptバンドルやソースマップの直接参照、ネットワークレスポンス本文の取得、Web検索、汎用シェルコマンドの実行などは公開機能に含めてはなりません。ネイティブアプリの検証ではAndroidの実機／エミュレータおよびMaestroの実行経路を確認します。なお、iOSは現行のADR-0011の規定どおり、CIでのビルド確認のみ（CI Build-only）を対象とします。

## 3. チャーター、判断基準、実行記録

QAチャーター（Charter）には、`spec_refs[]`（仕様参照）、ミッション、リスク、担当ロール、初期シードデータ、対象プラットフォーム、ビューポート／検証デバイス、ランタイム制御、リソースバジェット、終了条件（Stop Condition）、必須カバレッジをあらかじめ固定して定義します。合否の判断基準はBRやACを最優先とし、参照元となる正式な正本ドキュメントを受講者向けバンドルへ決定論的（確実・一意）に含めます。

実行記録は、スクリーンショット、アクセシビリティツリー、DOM、URL／画面名、限定ログ（Narrow Log）などの相対パス参照として保存します。実際に直接観測した期待値（Expected）と実測値（Actual）を明記し、推測による解釈とは明確に区別します。検出された不具合（Finding）が0件であった場合でも、カバレッジの達成状況（`completed` / `not_completed` / `blocked_environment`）、実際の実行記録、および探索を終了した理由を必ず記録として残します。

単一の不具合指摘（Atomic Finding）は、必ず1つのプロダクトの振る舞い（Product Behavior）のみを対象とします。複数の不具合を1つにまとめて報告した提出は `invalid_non_atomic`、同一不具合に対する重複報告は `duplicate` として処理されます。正常な挙動を誤って不具合として報告した偽陽性（False Positive）については、該当項目に関する具体的な観測記録が存在する場合に限り `FP_non_defect` に分類します。未探索または観測が不十分な項目は、真陰性（TN）ではなく未評価（NE）として扱います。確定した不具合指摘は、対応する単体テスト（Unit）、結合テスト（Integration）、コンポーネントテスト（Component）、E2Eテスト、またはネイティブ向けのリグレッションテストのうち、最小のテスト層へフィードバックして還元します。

## 4. 受講者向けChallenge演習

機械可読なインターフェース契約（Machine Contract）には、JSONとZodスキーマを採用します。チャレンジ課題の受講者向けJSONには、不具合／正常動作（Defect / Non-defect）の正解分類、Answer Item ID、パッチの適用意図、内部的な対応マッピングなどの秘匿情報は一切含めません。解答キー（Answer Key）およびUnified Diff形式のパッチファイルは講師専用の資料です。パッチを適用して課題環境を準備する手順は以下のとおりです。

```text
Baseline Build / Serve / Install
→ Pre-patch Baseline Sanity
→ cleanup / clean status
→ git apply --check → git apply
→ Patched Build / Serve / Install
→ Post-patch Sanity
→ Scored Initial StateへReset
→ runtime cleanup
→ Fresh Coding Agent Session (Agent Runtime / Host provided)
```

パッチ適用前のベースライン（Pre-patch）ですでに該当の不具合が存在している場合や、`git apply --check` による事前チェックが失敗する場合、あるいはパッチ適用後（Post-patch）に不具合の再現条件を満たさない場合は、採点対象の実行（Scored Run）を開始してはなりません。また、パッチはアプリケーションの作業ブランチに適用するのみとし、コミットを作成したり、Runnerのルートディレクトリへコピーしたりしてはなりません。

Black-box ScoredモードにおけるカバレッジのSSOTは `challenge.required_coverage` のみです。NormalモードおよびGray-boxモードのカバレッジは、QAチャーターから導出されます。Runnerが必須カバレッジの項目IDを勝手に削減、追加、または並べ替えることは禁止されています。`challenge_id + benchmark_revision + runtime_variant_id` の組み合わせがベンチマークの識別情報（Benchmark Identity）となり、同一条件下でRunnerの性能を公平に比較するためにはRunnerプロファイルも完全に一致させる必要があります。クリーンにコミット済みの入力ソースは `git:<40文字の小文字16進数>` で表し、未コミットの変更を含む入力や混在した入力は、正規化マニフェスト（Canonical Manifest）のSHA-256ハッシュ値である `sha256:<64文字の小文字16進数>` で識別します。

Runnerは新規のコーディングエージェントセッション（Fresh Coding Agent Session）上で動作し、許可ツールリスト（Positive Tool Allowlist）に限定したツールのみを使用するとともに、禁止機能プローブ（Forbidden Capability Probe）の検査を通過する必要があります。また、Runnerと評価器（Evaluator）は完全に分離された別セッションで実行されます。テストハーネスはRunner自体の起動、ラッパー処理、自動リトライを行いません。Evaluatorは、探索完了後に固定化された `qa-findings.json`（Frozen）を書き換えることなく、この段階で初めて解答キーを読み込み、突き合わせと判定結果（Match / Adjudication）を `evaluation.json` に記録します。環境のブロッキング障害、環境隔離の失敗、ツールスコープ違反、ベンチマーク識別情報の不一致が発生した場合は `valid_for_scoring=false`（採点無効）とし、その理由を `invalid_reasons[]` に列挙型・重複排除・辞書順で記録します。

## 5. 評価の読み方

正解の不具合（Defect）に対して正しく一意に報告された単一の不具合指摘（Atomic Finding）は真陽性（TP: True Positive）、見逃された不具合は偽陰性（FN: False Negative）としてカウントします。正解に該当しない不一致の指摘（Unmatched Atomic Finding）、複数不具合を束ねた無効な報告（`invalid_non_atomic`）、および正常動作に対する誤報告（`FP_non_defect`）は、適合率（Precision）の計算において偽陽性（FP: False Positive）として計上します。なお、`FP_non_defect` は適合率におけるFPの部分集合（subset）であり、同一の指摘を二重にカウントすることはありません。また、仕様上正常な動作（Non-defect）については、具体的な実行記録を伴って正常であることが確認できた場合のみ真陰性（TN: True Negative）とし、未確認の項目は未評価（NE: Not Evaluated）とします。

```text
Recall = TP / (TP + FN)
Precision = TP / (TP + FP)
False Positive Rate = FP_non_defect / (FP_non_defect + TN)
Coverage = completed_required_coverage_items / required_coverage_items
```

各指標の計算において分母が0となる場合は `null` とします。もし予期せぬ妥当な指摘（Unexpected Valid Finding）が、問題側に登録漏れしていた真の不具合であった場合は、過去の実行結果を後から辻褄合わせで再採点してはなりません。該当の実行結果は無効化し、正解データ（Ground Truth）の更新、新たなベンチマークリビジョンの発行、および同一Runnerプロファイルでの新規再実行（Fresh Re-run）を最初からやり直します。

## 演習

1. Storefront機能の `BR`（ビジネスルール）と `AC`（受け入れ条件）をもとに、想定されるリスク、テストケース、Playwrightによる実行記録を対応表として整理する。
2. 同様の観点からNormalモード用のチャーター（QA Charter）を作成し、必須カバレッジを満たしていれば不具合指摘（Finding）が0件であっても品質保証として十分である理由を説明する。
3. 受講者向けルートディレクトリ（isolated root）にBasic Challenge環境を準備し、そのディレクトリ内にソースコード・パッチ・解答キーが存在しないことを検証（Probe）する。
4. TP、FN、FP、TN、NE、`FP_non_defect`、`invalid_non_atomic`、`blocked_environment` の各指標を、小規模なテストデータ（Fixtures）を用いて手動で再計算する。
5. Androidの実行機能（Capability）が利用可能な環境では、ネイティブアプリの購入フロー（Customer Flow）をGray-boxモードで観察・探索する。利用できない環境では、MaestroのリグレッションテストがPASSしたことのみをもって機能利用可能（Capability PASS）と見なさず、未実施となった具体的な理由を記録に残す。

## 参照

- [Specification Entry](../../../spec/README.md)
- [Agentic QA Workflow](../../../reference/agentic-qa-workflow.md)
- [QA Agent Contract](../../../../QA_AGENT.md)
- [Part 1 総合演習](./09_part1-capstone.md)
