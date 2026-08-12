# Tasks

## Now

- [x] 1. 正本Plan、repair-loop、AGENTS、前回Run、CLI／custom agent設定を再確認する
- [x] 2. 今回の修正指示をmust_fix／should_fix／defer／rejectへtriageし、allowed scopeを確定する
- [x] 3. spawn独立expected ledger、reasoning evidence、changed-files／scope集約、dispatcher接続を実装する
- [x] 4. contract／Bash／PowerShell／schema／documentationの必須差分を実装する
- [x] 5. changed-files fixture（clean、pre-dirty unchanged／modified、new、delete、rename、copy、status unavailable、accepted subagent merge）を検証する
- [x] 6. 同一Parentからcode_researcher／implementation_researcher／test_investigatorをparallel spawnし、runtime complianceを再証明する
- [x] 7. custom childのadditional subagent spawn禁止をnegative testで再証明する
- [x] 8. quality_gate_runnerをdispatcher経由で新Strict Runへ接続し、5 actionを順序どおり実行する
- [x] 9. Source Integrity before／after、scope、completion state、evaluation evidenceを新Runへ記録する
- [x] 10. contract／focused／local／full validationとdispatcher negative testを実行する
- [x] 11. sanitizer Write／Checkを実行し、residual findings 0を確認する
- [x] 12. REPORT／evaluation／run manifestの最終判定とユーザー向けEvidenceを完成する

## Discovered

- [x] D1. `.pyc`のtracked状態とglobal raw hook logのtracked状態を確認し、削除なしでPR混入防止を判定する
- [x] D2. quality childのPATH／writable rootが現行CLIで解決可能か確認する
- [x] D3. 既存 `scope_violation=true` の生成元をparent／subagent／runtime complianceに分解して確認する
- [x] D4. 過去Runのtask_completion evidence／historical warningは変更せず、新Runとのcurrent／historical境界を確認する

## Blocked

- B1. L3のpermission／sandbox／approval変更が必要な場合はユーザー承認なしに進めない

## Deletion candidates

| Path | Reason | Suggested action |
|---|---|---|
| scripts/__pycache__/validate-luna-orchestration.cpython-311.pyc | 既存追跡済みbinary generated artifact。通常のapply_patchではinvalid UTF-8のため除去できず、git rm／command deletionは実行しない。 | ユーザーが明示承認した安全なbinary除去手段で追跡解除する |
