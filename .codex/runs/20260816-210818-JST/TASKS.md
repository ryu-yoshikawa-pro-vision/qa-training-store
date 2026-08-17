# Tasks

## Now

- [x] 1. 指定Plan・repo契約・Runを確定する
- [x] 2. Phase 0: Windows Native installed Codex／Hook discovery／Full Access routeを実測する
- [x] 3. Existing Hook／config／rules／wrapper／verifyの変更面とtest entry pointを確定する
- [x] 4. Node canonical Policy HookとWindows launcher／configを実装する
- [x] 5. Rules／requirements／wrapper／verifyを新Contractへ同期する
- [x] 6. Matrix data-driven Contract TestとWindows launcher testを実装する
- [x] 7. Temporary clone／local bare remoteでFull Access real acceptanceを実行する
- [x] 8. Docs／legacy参照／PROJECT_CONTEXT・ADR要否を確認し同期する
- [x] 9. Required quality gatesとgit diff／scopeを検証する
- [x] 10. Independent Reviewを実施し、Critical/High findingを修正する
- [x] 11. Run Artifact／evaluationをsanitizer/schema checkし、最終REPORTを確定する

## Discovered

- D1. 旧`.codex/config.toml`は`features.codex_hooks`、広いmatcher、relative `pwsh` launcher、legacy `.ps1` runtime参照を持つ。
- D2. 旧PowerShell/Python Hookはpayload全体を再帰scanし、通常のgit mutation・`terraform apply`・`kubectl apply`・patch delete/renameもdenyするため、Plan Matrixと不整合である。
- D3. Codex 0.147.0の`codex doctor`は20秒超でtimeoutした。原因は未確定であり、Phase 0の後続実測で補完する。
- D4. 全体format gateは今回未変更の既存93ファイルでfailし、全contract gateは今回未変更のOfficial artifact 2件／Training Native YAML 1件でfailした。変更差分とのhash／scope因果は確認できず、今回の作業へ取り込まない。
- D5. temp cloneの初回通常Full Accessではproject／Hook reviewがpersistされる前にHookが発火しなかった。公式one-off `--dangerously-bypass-hook-trust`でHook発火とdenyを確認し、生成したtemp trust entryは後で除去した。

## Blocked

- なし
