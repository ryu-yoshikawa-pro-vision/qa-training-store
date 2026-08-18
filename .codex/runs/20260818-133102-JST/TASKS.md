# Tasks

## Now

- [x] branch / remote HEAD / worktreeを同期確認し、strict Runを初期化する
- [x] Working Agreement、SSOT P-13、最新ADR、既存Run Artifactを確認する
- [x] `gh auth status` / `gh pr view`を実行し、CLI可否とfallbackを記録する
- [x] Dependabot APIからopen High alertを取得する
- [x] P-13必須項目で全High alertを個別triageする
- [x] CodeRabbit reviewとreview thread stateを取得する（review実施時HEAD: `c95340c51dc71ebc726a8d89eea1f6e31313a239`）
- [x] 修正済み古いCodeRabbit threadをreview対象HEAD `c95340c51dc71ebc726a8d89eea1f6e31313a239`へ照合し、必要なものをresolveする
- [x] Run Artifactを更新し、sanitizer / evaluation / 最終pre-merge判定を完了する

## Discovered

- [x] 最新Dependabot Alert APIとGitHub Advisory APIを再取得し、nanoidの訂正値と他6件の整合性を確認する
- [x] P-13 triageをhistoryへappend-onlyで記録する
- [x] REPORT、PLAN、TASKS、run.json、evaluation.jsonへ今回の訂正と継続結果を反映する
- [x] markdown / diff / schema / sanitizerを実行する（verifyはsource/package無変更のためCI結果と合わせて判断）
- [x] diffをself-reviewし、許可されたファイルだけをstageする
- [x] feature branchへ通常commit / pushする
- [x] push後にPRのPhase 1 CI / Native CIを確認する
- [x] CodeRabbit full reviewを1回実行する（実施時HEAD: `c95340c51dc71ebc726a8d89eea1f6e31313a239`）
- [x] review threadを再取得し、unresolved 0を確認する
- [x] PR #31のmerge-readyとRepository Hardening Completeの最終判定を記録する

- [x] 最新CodeRabbitの現Run / historyに対する2件を最小修正し、過去Run書き換え要求はWorking Agreementに基づき採用しない
- [x] CodeRabbit起動の事前確認・承認ルールを関連文書へ追記する

## Blocked

- PR-side handoff（実装修正の対象外）: CodeRabbit full review実施後に追加されたdocs / Run Artifact更新を含む最新PR HEADに対する最終CodeRabbit reviewと、stale `CHANGES_REQUESTED` reviewの扱いは、PR側で別途判断・実施する。対象SHAはレビュー実行時にGitHubから最新PR HEADを取得して確定する。今回のRunではreview起動、dismiss、thread mutationを行わない。
