# Tasks

## Now

- [x] branch / remote HEAD / worktreeを同期確認し、strict Runを初期化する
- [x] Working Agreement、SSOT P-13、最新ADR、既存Run Artifactを確認する
- [x] `gh auth status` / `gh pr view`を実行し、CLI可否とfallbackを記録する
- [x] Dependabot APIからopen High alertを取得する
- [x] P-13必須項目で全High alertを個別triageする
- [x] CodeRabbit最新reviewとreview thread stateを取得する
- [x] 修正済み古いCodeRabbit threadをcurrent HEADへ照合し、必要なものをresolveする
- [x] Run Artifactを更新し、sanitizer / evaluation / 最終pre-merge判定を完了する

## Discovered

- [x] 最新Dependabot Alert APIとGitHub Advisory APIを再取得し、nanoidの訂正値と他6件の整合性を確認する
- [x] P-13 triageをhistoryへappend-onlyで記録する
- [x] REPORT、PLAN、TASKS、run.json、evaluation.jsonへ今回の訂正と継続結果を反映する
- [x] markdown / diff / schema / sanitizerを実行する（verifyはsource/package無変更のためCI結果と合わせて判断）
- [x] diffをself-reviewし、許可されたファイルだけをstageする
- [x] feature branchへ通常commit / pushする
- [ ] push後にPRのPhase 1 CI / Native CIを確認する
- [x] 最新HEADでCodeRabbit full reviewを1回実行する
- [ ] review threadを再取得し、unresolved 0を確認する
- [ ] PR #31のmerge-readyとRepository Hardening Completeの最終判定を記録する

- [x] 最新CodeRabbitの現Run / historyに対する2件を最小修正し、過去Run書き換え要求はWorking Agreementに基づき採用しない

## Blocked

（なし）
