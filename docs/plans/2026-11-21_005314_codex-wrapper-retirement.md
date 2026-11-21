# Codex独自実行ラッパー廃止計画

## 0. 依頼概要

- 依頼内容: PR #226から現在不要なCodex起動ラッパーと、ラッパー専用の設定・検査・ドキュメントを整理する。
- 背景: 通常開発ではLinuxから直接`codex`を起動し、Codex標準のsandbox、承認、Hook、execpolicy、subagentを利用する方針になった。
- 期待成果: 独自起動経路をなくし、必要なRun管理、sanitizer、credential検査、Git安全性、CI、履歴保全を維持する。

## 1. ゴール / 完了条件

- ゴール: 非対話task、対話型safe、Docker sandbox、手動Run cleanupの未使用経路を、実行時呼び出し元と残存契約を確認して廃止する。
- 完了条件:
  - 指定された4種類の起動ラッパーと専用テスト・CI・存在検査がなくなっている。
  - cleanupが通常コードから呼ばれず手動整理専用である場合、スクリプトと専用契約を廃止する。Runデータは一切削除・移動しない。
  - direct `codex`を通常の起動手順として正本へ記載する。
- `new-run`、strict Runのcollector、evaluation、Hook、execpolicy、sanitizer、credential scan、CI保護は維持される。`new-run`のwrapper専用preset選択肢と新規Runへの既定preset出力は除去し、既存manifestにあるpreset値はcollectorが互換用に保持する。
  - Linux品質ゲートと最新HEADの必須CIを確認する。
  - 実Codex runtimeの検証が実行環境制約で完了しない場合、未検証として明記する。ユーザーはこの残件を今回のcommit/push/CIの阻害要因にしない方針を確定済み。

## 2. 現状理解と前提

- 現状理解:
  - 開始時PR #226はopen、base `main`、branch `feat/codex-parent-delegation-20261117`、PR/local/origin HEADは`64f6378a166a407d9b5d02b2acbd8ed1e71cc5c3`で一致し、worktree/indexはclean。
  - 開始HEADに対するWeb CI run `44748445742`とMobile App CI run `44748445846`はsuccess。
  - safe/taskは相互にpreflight連携し、sandboxはtaskへ委譲する。CI/verify以外に通常package entry pointはない。
  - cleanup scriptsはruntime callsiteが見つからず、手動の保守機能としてドキュメントと専用テスト/CIからのみ参照される。
  - strict Runの`run.json`はmachine-managedであり、`new-run`とcollectorの集約責務は引き続き必要。direct Codex終了後のcollector明示実行で機械更新を行う。`new-run`のpreset指定は実行挙動を変えないため廃止し、新規manifestからpreset値を除く一方、既存manifest内の値は更新時に保持する。
  - `.codex/config.toml`はworkspace-write、approval_policy=never、network access=trueを設定する。PreToolUse HookはBashに限定され、`apply_patch`やMCP操作はmatcher対象外。
  - Codex CLI 0.170.0を直接起動したが、`/home`配下のCodex stateが読み取り専用でSQLiteを初期化できず、通常起動と`--no-daemon`がexit 1となった。`/hooks`とruntime Hook発火は未確認。
  - CodeQLの未解決review threadが`tests/contracts/codex-hook-contract.test.ts`の202行と213–216行に2件ある。今回の削除と無関係な既存指摘として扱い、thread解決や無根拠な誤検知判定はしない。
- 前提:
  - 明示的な削除対象はこの依頼に記載されたラッパー、不要となる専用テスト/設定/文書に限る。
  - User/Home sandbox、承認設定、Hook設定は緩和しない。
- 対象外:
  - `runs/**`、`.codex/runs/**`の保存済みデータ。
  - Nativeアプリ、Web製品仕様、Node/pnpm依存。
  - PowerShellローカル実行。Windows向けコードとCI契約は残す。

## 3. 質問 / 曖昧性

- 削除主体: ユーザーがwrapper実装、wrapper専用test、orphaned rules-auto-net、手動専用cleanup一式の計14ファイルをLinux checkoutから削除した。親は削除を代行していない。
- 仮定してよい細部: wrapper専用テストは独立Hook／Run／sanitizer契約と重複するため移植せず、不要なテストファイルはユーザーが削除する。`cleanup-runs.*`はruntime callsiteがなく手動保守のみであり、Run保持方針との整合性から削除候補とする。
- Codex runtime: ユーザー方針によりruntimeでのHook配信・発火、危険Bash拒否、親子委任は未検証として残す。この未検証はwrapper整理、commit/push、CI確認を止めない。sandbox、approval、CODEX_HOMEは変更しない。

## 4. 影響範囲

- 影響範囲: scripts、`.codex`のwrapper-only preset/requirements、verify、contract tests、workflow、現在の運用文書。
- 確認対象ファイル: `scripts/codex-safe.*`、`scripts/codex-task.*`、`scripts/codex-sandbox.*`、`scripts/cleanup-runs.*`、`scripts/verify*`、`scripts/collect-run-artifacts.*`、`scripts/new-run.*`、`.codex/config.toml`、`.codex/rules*`、`.codex/requirements.toml`、`tests/contracts/**`、`.github/workflows/**`、`package.json`、README/AGENTS/PROJECT_CONTEXT/安全・実装・Run reference。

## 5. 変更方針

1. 現行の実行呼び出し・テスト・CIの参照を分け、wrapper/cleanup専用と独立Run・安全性契約に分類する。
2. wrapper、Docker path、auto-net overlay、wrapper専用contractを廃止し、verify/CIが削除済みファイルを要求しないようにする。
3. cleanupが手動専用であることを反映してscript・専用contract・現行手順を除去する。既存のRun成果物には触れない。
4. strict Runでは`new-run`でRunを作り、直接`codex`を起動し、既存collectorを明示実行してmanifestを更新する運用へ文書を合わせる。`new-run`のpreset CLIと新規manifestのpreset既定値は除去し、旧manifest値はcollectorで保持する。evaluationとsanitizer契約は維持する。
5. `.codex/config.toml`、agents、Hook、共通rules、sandbox/approval値を維持し、direct起動の実効安全範囲とHook信頼条件を正確に説明する。
6. 影響範囲のLinuxテスト/verifyを実行し、stage後品質ゲート、通常hook、commit/push、最新HEAD CIを行う。

## 6. 検証方法

- `bash -n scripts/verify`
- `pnpm run test:hooks`
- `pnpm run test:contracts`
- `pnpm run security:check`
- `pnpm run lint`
- `pnpm run typecheck`
- `bash scripts/verify`
- 実行可能な場合は直接`codex`から`/hooks`、安全な通常操作、無害な危険コマンド拒否を確認。
- final stage後: `pnpm run quality:staged`、`node scripts/sanitize-codex-artifacts.mjs --staged --check`、`git diff --cached --check`。
- Commit/push後、PR HEADとSHAを照合し、最新HEADのWeb CI・Mobile App CI・その他必須チェックを確認する。

## 7. リスクと未解決論点

- リスク: wrapper専用testを削除する際、Run manifestやHookの独立安全契約を誤って削除しない。既存のRun/sanitizer/new-run/Hook contractへ依存を残す。
- リスク: direct CLIのproject trustとHook definition trustはユーザー環境側の状態であり、静的CIだけではruntime発火を証明できない。
- リスク: 文書・検証からwrapper記述だけを先行除去すると、現存scriptとの説明不整合を生む。ユーザーによる14対象の削除と参照監査で整合を確認した。
- 発見済み契約不整合: 現行文書はstrict Runに有効なevaluationを必須としているが、collectorの`--strict`はevaluation欠落とschema-invalidの双方を受け入れていた。strict呼び出し元と生成経路を確認し、明示された「strict Run契約を維持」に従って、既存`validate-output-schema.py`を再利用して不足チェックと回帰テストを追加する。既存要件の緩和、新しい依存、または評価方式の追加は行わない。
- 実runtime: Codex state DBへのread-only制約により未検証だが、ユーザー方針によりsandboxや権限を変更せず未検証のまま記録し、他の完了作業は継続する。
- Linux sandbox: `test:hooks`、`test:contracts`、`pnpm run verify`の一部は`spawnSync ... EPERM`またはlocalhost `listen EPERM`で失敗した。FAILとして記録し、GitHub CIの結果と区別する。stage、commit/push、PR更新、新HEAD CIは続行する。

## 8. 成果物

- 変更ファイル: 実装調査完了後、wrapper-only scripts/tests/config/docs/CIに限定して確定。
- 付随ドキュメント: 本計画、active RunのTASKS/REPORT、PR本文。

## 9. 備考

- 既存Run `runs/20261117-233113-JST/`とその過去記録は変更せず、本task用に`runs/20261121-005314-JST/`を初期化した。
- Codex公式Rules資料は、project-local `.codex/rules/`がproject layer trust後に起動時ロードされる条件と`codex execpolicy check`がルール診断であることの一次情報として参照した。

## 10. ロールバック

- 検証で回帰が見つかった場合は、当該変更を含む現在のbranch/HEADと作業差分を確認し、削除した実装や契約が原因なら通常の修正commit、または通常のrevert commitで対象差分だけを戻す。
- force push、reset、cleanで履歴や作業ツリーを巻き戻さない。`runs/**`と`.codex/runs/**`の既存成果物はロールバック対象にしない。
- Codexのsandbox、approval、Hook、credential scan、sanitizerの設定を弱めて回避しない。直接起動のruntime確認ができない場合は未検証として残すが、今回のユーザー方針に従いそれだけを理由に作業を止めない。
