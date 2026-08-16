# Tasks

## Now

- [x] 1. Worktree boundary、HEAD、branch、statusをread-only確認する
- [x] 2. Project context、ADR、reference plan、直近Run、repair/review手順を読む
- [x] 3. PR #23のCodeRabbit review threadsを取得し、root causeへtriageする
- [x] 4. Repair Plan、allowed scope、最大iterationをRun Artifactへ確定する
- [x] 5. Linux preparation failureとWindows/root topologyを再現・比較し、platform-specific preparation方針を確定する
- [x] 6. Canonical JSON、bare origin、tool isolation、evidence 1:1、Runner Profile schemaを修正する
- [x] 7. Protected patch parserとprepare-challengeの共通化を修正する
- [x] 8. Canonical artifact layout、one run/one challenge guard、runner input/evidence refs/default pathsを統一する
- [x] 9. Trusted Runner Profile freezeとHost receipt bindを実装し、Evaluator fallbackを除去する
- [x] 10. Runtime handoff receiptを追加し、未証明readiness流用を廃止する
- [x] 11. Initial State receipt binding、source-free freeze validation、post-freeze integrityを完成する
- [x] 12. Resource discovery union、webmanifest分類、complete probe matrix、not_executed fail-closeを完成する
- [x] 13. Sec-Fetch-Destの非security扱いとRuntime Variant probe helperの誤保証を修正する
- [x] 14. Official evaluator intrinsic verification、diagnostics、evaluation artifact contractを修正する
- [x] 15. Canonical preparation sequenceを実装・docs・testsへ反映する
- [x] 16. Full Official Artifact Chain valid fixtureを作り、mutation matrix negative testsを追加する
- [x] 17. CodeRabbit低価値指摘、skill manifest矛盾、Run artifact記録を修正する
- [x] 18. Targeted validationを実行し、失敗を分類してRepair iterationを判断する
- [x] 19. Required quality gates、diff check、self-review、scope auditを実行する
- [x] 20. Run artifact Sanitizer Write/Check、evaluation/run.json整合、最終報告を確定する

## Discovered

- [x] D1. P0/P1追加要件はCodeRabbit 23件を越えるroot-contract test scopeを要求する
- [x] D2. `evaluation.json`の既存schema/toolingを確認し、Strict Runの保存先とderived fieldを接続する
- [x] D3. Linux CIの実ランタイムは現Hostで再現できない場合があるため、コード上のtopology regression testを追加する
- [x] D4. Host-trusted Runtime handoff receiptはRepository側schemaとして追加し、実Host証跡が無い限りPASSしない
- [x] D5. 引用符付きpatch pathがprotected prefix判定を迂回しないfail-close回帰を追加する

## Blocked

- B1. Official execution/scoringはHost Capability Receipt、Fresh Context、Actual Tool Scope、trusted Runtime handoffが不足する限りBLOCKED。Repository deterministic validationの完了を妨げない。
