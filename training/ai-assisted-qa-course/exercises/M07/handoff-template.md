# M07 Phase 2 → Phase 3 handoff

M07終了時に本人が記入します。教材テンプレートには完成した修正回答やPASSを含めません。

## 成果物契約

- artifact ID / revision / contract: `M07-result-03` / `M07-result-v1` / `M07-to-M08-handoff-v1`
- コース配布元SHA（`.course/distribution-manifest.json`）:
- 対象module load receipt:
- 修正後spec: `workspace/M07/repaired-assertion.spec.ts`
- 保守演習の本人spec: `workspace/M07/maintenance.spec.ts`（`M07-result-04` / `M07-result-v1` / `M07-to-M08-handoff-v1`）
- M06から引き継いだCart Case・spec・提出物のID、revisionと、公開fallbackを使った場合の区別:
- Playwright Config: `playwright.ai-assisted-qa.config.ts`
- 依存: `package.json`、`pnpm-lock.yaml`（各SHA-256）
- Reset helper: `training/playwright/support/reset-scenario.ts`（SHA-256）
- 対象Seed / Scenario:

## 実行証拠

| Run | コマンド・対象spec | Run ID / 実行revision | 終了状態 | 根拠の保存先 |
| --- | --- | --- | --- | --- |
| Assertion修正前 | `pnpm course:run M07 repaired-assertion.spec.ts --label before` |  |  |  |
| Assertion修正後 | `pnpm course:run M07 repaired-assertion.spec.ts --label after` |  |  |  |
| 保守変更前（既存2件） | `pnpm course:run M07 maintenance.spec.ts --label before` |  |  |  |
| 保守変更後（独立3件以上） | `pnpm course:run M07 maintenance.spec.ts --label after` |  |  |  |

- 各Runの`source_sha`・`spec_sha256`・spec snapshot・JSON report・test件数・終了コードの照合:
- 保守変更後の3件目が、数量2へ更新後に別ページへ移動しCartを開き直すことを確認した実Run:
- Case IDとAssertionの対応:
- Reset結果とscenario照合:
- 修正の理由・採用しなかったAI案:
- 失敗・未実行・未確認の区別:
- 未解決事項:

## 引継ぎ判断

- spec、Config、依存、Reset、実行証拠が同じ配布/実行revisionに対応しているか:
- Git/PRを使わない成果物保全先（ローカルまたは個人の非公開領域）、保全したファイルと再取得・復元の確認結果（Secret、認証状態、個人情報、配布manifestや非公開採点資料を混ぜない）:
- 公開可能な差分だけを選ぶためM08で確認する点:
- このhandoffはM07の機械的構造確認であり、人によるPhase 2修了判断ではない:
