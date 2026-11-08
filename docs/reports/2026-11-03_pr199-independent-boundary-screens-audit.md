# PR #199 非干渉の基本分析：Boundary画面5操作

調査基点: PR #199 HEAD `b671561a834998a58ef59c3047b7d47e76569c9c`（前回の独立作業基点）  
更新先: `work/pr199-parallel-supporting-analysis-20261103`（PR #199本体には未取り込み）  
台帳: `training/ai-assisted-qa-course/coverage/supported-behaviors.json`

## 対象と判定

| 操作ID | 基本分析 | 証拠・未受入 |
| --- | --- | --- |
| `SCREEN-BOUNDARY-NOT-FOUND-A01-01` | `analyzed` | Web StatePanel(not-found)とNative固有タイトル+汎用Unsupported本文の差。実ルート表示は未受入 |
| `SCREEN-BOUNDARY-NOT-FOUND-A01-02` | `analyzed` | Web href=/、Native router.replace('/')。Session/DB不変とRole別実遷移は未受入 |
| `SCREEN-BOUNDARY-NOT-FOUND-A02-01` | `analyzed` | Web/Nativeの+not-foundエントリ・Slot・可視画面の静的照合。実Router fallbackは未受入 |
| `SCREEN-BOUNDARY-FORBIDDEN-A02-01` | `analyzed` | Web guest/customer→/、staff→/admin、Native→/。非active staffの再拒否は未受入 |
| `SCREEN-BOUNDARY-FORBIDDEN-A01-01` | `review_required` | RouteGuardは静的確認。認可境界の実Run・データ不変/Native文言・非active staffの循環確認が不足 |

基本分析完了の4件は正式仕様、Web/Nativeのルート・表示、default guest Seed、Role、Risk、C1以降のCondition/Case採否を個別に台帳へ記載。操作の画面表示自体は業務Use CaseやRepositoryの直接更新を呼ばない。**静的照合であり、製品の正しさ、権限保証、Web/Native実Run、視覚・a11y、最終受入のPASSではない。**

## 確認した実装と仕様

- 正式仕様: `docs/spec/ui-ux-contract.md:12-44`、`docs/spec/roles-and-permissions.md:1-57`、`docs/spec/screen-catalog.md`。
- Web Not Found: `app/+not-found.tsx`→`src/presentation/components/states.tsx:26-77`。専用のNot Found文言、既定 `Link href="/"`。
- Android Not Found: `app/+not-found.native.tsx`→`src/presentation/native/native-screens.tsx:995-1007`。タイトルは「ページが見つかりません」、本文は汎用「Native Customerの対象外です」、ボタンは `router.replace("/")`。
- Web Forbidden: `src/presentation/guards/route-guard.tsx:16-55` は未ログイン・Role・active状態に応じて拒否。`app/forbidden.tsx:5-13` はoperator/adminというRoleだけで `/admin` を提案し、`StatePanel` の既定ホームLinkを置き換える。
- Android Forbidden: `app/forbidden.native.tsx` は `NativeUnsupportedScreen` を利用。`NativeShell` はcustomer以外のSessionを遮断する。Webと禁止理由の説明が異なる。
- 初期条件: `src/seeds/metadata.ts:75-84` のdefault guest初期Session、`src/seeds/scenarios.ts:20-38`。画面の読取と復帰にSeedのCart/Order変更は不要。実際のDB/Session前後比較は未実施。

## #210の製品適合確認候補

1. AndroidのNot Found本文が「画面が存在しない」ではなく、権限/対象範囲の説明になる点。正式UI-UX規約の未検出・権限拒否の分離と、Android画面参照に照らして実確認する。
2. AndroidのForbiddenも「Native前半の対象外」を表示する。実際の権限不足を説明できるか確認する。
3. Webでは `accountStatus` に関係なくstaff RoleならForbiddenに `/admin` Linkを表示する。`RouteGuard` はactiveを必須とするため、停止staffで `/forbidden`⇄`/admin` の繰り返しが生じるか実検証する。到達可能性・Session生成条件が未確認であり、**循環不具合の確定ではない**。

製品SUT・正式仕様・Seed/Reset・製品テストの修正はこの調査で行わない。新規Issue/PRも作成しない。

## 件数、検証、取り込み

- 前回の独立ブランチ: 操作 **131/188**、非default状態 **17/20**。
- 今回の変更後: 操作 **135/188**（+4、残53）、非default状態 **17/20**（変化なし、残3）。調査5件のうち1件は `review_required` を維持。
- 同じ調査基点のPR #199本体は操作 **121/188**、状態 **17/20**。独立ブランチ成果14件は**未取り込み**。PR #199の現在値は最新HEADの台帳から再集計が必要。
- 台帳のJSON書式同一性、対象5 IDの旧status、4件の `completeAnalysis` 必須欄/3種 `reviewed_against`、残り1件のstatus、分析件数をスクリプト相当の静的条件で照合。
- `node scripts/training/validate-supported-behaviors.mjs`、Vitest、Playwright、Android実機、CIは**未実行**。形式上の確認をこれらの成功と取り違えない。
- #199の台帳は定期実行が更新中。取り込み時は**最新HEADとID単位で内容・重複・根拠を照合**し、JSON全体を上書きしない。共通Plan/定期実行設定/学習用契約テスト/製品コードには触れない。
