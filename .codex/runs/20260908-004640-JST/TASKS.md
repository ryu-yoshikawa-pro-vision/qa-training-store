# Tasks

## Now

- [x] 1. PLANを確定し、今回のGate・canonical停止条件・禁止事項を固定する
- [x] 2. branch/PR/latest main/既存Plan/旧invalid artifact/source scopeを確認する
- [x] 3. 既存Targetをlatest routing SHAへ更新し、専用性・clean・trust/hook・process条件を確認する
- [x] 4. `codex-cli 0.153.4`固定でnegative/positive Probeを各1回実行し、duration/selector/correlationを記録する
- [x] 5. Environment Qualification Gateを判定する（positive `<=240秒`）。FAILならcanonicalを開始しない
- [ ] 6. Gate PASS時のみcanonical `all`を24 case sequential/retryなしで1回実行し、8-side coverageを判定する
- [x] 7. validation/evaluation/sanitization、PR本文、Run Artifact commit/push、完了判定を行う（Gate FAILを正式blockerとして保存）

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）

## Blocked

- B1. positive terminal durationが`367.7009秒`でGate閾値`240秒`を超過し、現行selectorもactual Skill readを観測できなかったため、canonical `all`を開始しない。
