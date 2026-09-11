# Tasks（PR #127 OTel Trigger Eval observer実装・Qualification）

## Now

- [x] 1. 開始状態、正本Plan、既存Run、repo-local skill／workflowを確認し、Strict Runを初期化する
- [x] 2. PLAN／TASKS／REPORTへ実装scope、DoD、Qualification順序、停止条件を確定する
- [x] 3. 正本Planの44ms／956ms／約22.7倍の事実誤記を1文だけ補正する
- [x] 4. OTel observerを追加し、receiver／OTLP JSON／metric schema／liveness／Skill set／collection stateを実装する
- [x] 5. runnerへcase-local port、process-local override、child close起算quiet／hard capを統合する
- [x] 6. evaluatorへOTel observer-commonを統合し、Hookをdiagnostic／legacy onlyへ限定する
- [x] 7. observer／evaluator／runner回帰テストとADRを追加する
- [ ] 8. focused tests、formatter、lint、typecheck、verify、sanitizer、strict collectorを実行する
- [ ] 9. Evaluator source SHAを固定し、fresh Target preflight後にNegative Qualificationを1回実行する
- [ ] 10. Negative PASS時のみPositive、両方PASS時のみcanonical allを実行し、停止条件を記録する
- [ ] 11. Run／PR／Git branch safetyを最終化し、明示non-force pushと最終検証を完了する

## Discovered

- なし

## Blocked

- B1. `pnpm run verify`の既存Windows launcher契約テスト2件が5,000ms timeout。focused再実行でも再現し、今回のOTel許可scope外のためHook／test timeout変更は行わない。
