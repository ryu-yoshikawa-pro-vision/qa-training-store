# Issue #193: Run Artifact sanitizerをNode.jsへ統一し、Windows/Linux契約を揃えるPlan

## 0. 依頼概要

- 対象: [Issue #193](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/193)
- 作業branch: `issue-192-codex-git-workdir-guard`（Issue #192と共用。両Issueを同一ブランチ・同一PRで実装する）
- 参考: [qa-workflow-skills](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills)。特に既存CLI／scriptを単一の正本へ集め、固定入力・fixture・CIで保証する構成を参考にする。qa-workflow-skillsのartifact graphやQA SkillをこのRepositoryへ移植する作業ではない。
- 本変更はPlanのみ。sanitizer実装、PR作成、mergeは別作業。
- Codex利用者はFull Access／Approve for meのいずれも使用し得る。sanitizerの適用はCodex権限モードに依存させない。

- 実装とPRは[Issue #192のPlan](./2026-10-17_104100_issue-192-codex-git-workdir-guard.md)の「両Issue共通の実装・検証方針」に従う。#193のみを別PRで実装しない。

## 1. ゴールと完了条件

必須Run Artifact sanitizerの正本をOS非依存なNode.jsへ移し、PowerShell未導入のLinux/Codespacesからも`Write`／`Check`を実行できるようにする。同時に`codex-task.ps1`と`codex-task.sh`が書込み前sanitizeおよび最終gateを同じ正本で実行するよう揃える。

実装完了条件:
1. `node scripts/sanitize-codex-artifacts.mjs`をWindows／Linux/Codespacesで使用でき、`Write`、`Check`、両方指定、`ChangedOnly`、既存の明示path／alias／環境由来rootを扱える。
2. PowerShell実装の既存tokenと優先順位、Windows/Unix path variants、境界一致、URI／JSON escape、既知path置換、residual scan、BOM／invalid UTF-8、atomic write、findingの情報非漏えい、同一入力に対する二度目のWrite無変更を維持する。
3. Log／Report／Manifest／Evaluationの全書込み経路で、未サニタイズ文字列をtracked Run Artifactに一瞬でも確定書込みしない。最終Write＋Checkは異常終了を含む全経路で実行する。
4. 正常終了／異常終了／sanitizer自身の失敗／timeout時の優先exit codeと診断を現行PowerShell側の契約に照らして確定し、`.sh`も同じ契約へ揃える。
5. Ubuntu／Windowsで同じNode fixtureとCLI contractを実行し、既存PowerShell fixtureによるgolden確認と比較する。CIのchanged Run Artifact gateはnode実装だけで動作し、PowerShellインストールを前提としない。
6. `pnpm run verify`、focused tests、関連GitHub Actionsが最終HEADで成功する。Codespaces実機のWrite/Checkが実行できたことと静的テストPASSを混同しない。

## 2. 現状と根拠

- `scripts/lib/codex-artifact-sanitizer.ps1`は約950行で、`New-CodexArtifactSanitizerContext`、path variant、置換、残存検出、`ChangedOnly`、UTF-8読み取り、atomic write、line appendを担当する。
- `scripts/sanitize-codex-artifacts.ps1`は`-Write`／`-Check`／`-RepositoryAlias`／環境別root／`-ChangedOnly`を受け付けるCLI。異常時に安全なfindingのみ表示する。
- `scripts/tests/codex-artifact-sanitizer.test.ps1`にはWindows／Linux root、PATH置換の境界、JSON escape、URI、既知path、残存検出、UTF-8、原本保全、`ChangedOnly`、二度目のWrite等の実動作fixtureがある。
- `tests/contracts/codex-artifact-sanitization.test.ts`はPowerShell symbol文字列を前提にした静的確認を含む。機能移行後は実動作contract中心へ切り替える必要がある。
- `scripts/codex-task.ps1`は共通PowerShell sanitizerをdot-sourceし、Log／Report／Manifest／Evaluationを出力前に処理する。終了時`Invoke-CodexRunArtifactSanitization`から`-Write`／`-Check`を行う。
- `scripts/codex-task.sh`は`write_log`、`write_report`、`write_run_manifest`、evaluation template等で出力するが共通sanitizerの処理経路を持たない。終了時の同等gateもない。
- `.github/workflows/ci.yml`の`codex-artifact-sanitization` jobはUbuntu/Windows matrixながら`shell: pwsh`と`scripts/tests/codex-artifact-sanitizer.test.ps1`を使用する。
- `.github/workflows/security-dependency-fallback.yml`を含め、その他の`pwsh`／`powershell`呼び出しを網羅的に調査してsanitizer依存のみ置き換える。Windows固有スクリプトは対象外。
- #188のCodespacesでは`pwsh`がないため、既存CLIを同じcheckoutで実行できなかった。

## 3. 方針と正本構成

- 正本: `scripts/lib/codex-artifact-sanitizer.mjs`。Node.js 24の標準ライブラリとRepository既存依存で実装し、新しいnpm dependencyは追加しない。
- CLI: `scripts/sanitize-codex-artifacts.mjs`。`--path`（複数指定可能）、`--write`、`--check`、`--changed-only`、`--repository-alias`（複数）、`--virtual-store-dir`、`--android-sdk-root`、`--java-home`、`--maestro-home`のような明示argvへ対応する。これは新CLIの提案であり、実装時に既存呼び出しを網羅し、Windows互換wrapperの既存引数契約を残す。
- PowerShell互換入口: `scripts/sanitize-codex-artifacts.ps1`。既存利用者の`-Path`、`-Write`、`-Check`等を受け付け、変換してNode CLIを起動する薄いwrapperにする。置換・残存検出等の独立実装を残さない。Nodeのexit codeを正しく伝播する。
- Linux/macOSは`node scripts/sanitize-codex-artifacts.mjs`を標準入口とし、追加の`.sh` wrapperが本当に必要なconsumerがある場合に限り作成する。
- `codex-task.ps1`／`codex-task.sh`は共通Node正本を呼ぶ。PowerShell側へpath sanitizerロジックを二重実装しない。
- Portable coreの責務はサニタイズ・読み書き・安全なfinding・Git変更集合とする。`qa-workflow-skills`のQA artifact管理やdatabase、Skill体系を追加しない。
- 対象となるtext extensionは既存`.md`、`.json`、`.jsonl`、`.txt`。Binaryや無関係なlog領域へ対象拡大しない。

## 4. 移植前に固定する仕様

### テキスト変換

- 既存token `<REPO_ROOT>`、`<USER_HOME>`、`<ANDROID_SDK_ROOT>`、`<JAVA_HOME>`、`<PNPM_VIRTUAL_STORE>`、`<TEMP_ROOT>`、`<MAESTRO_HOME>`を維持する。Windows大小文字、優先順位（例えばtemp rootとhome root）、`USERPROFILE`／`HOME`の両登録を維持する。
- slash/backslash、escaped JSON path、Windows file URI、UNC、WSL、macOS/Linux home表記、空白を含むpath、末尾区切りとprefix衝突の既存期待値をfixture化する。
- 既知登録path置換後にも未知の絶対pathが残れば`Check`で検出する。pathらしい文字列を全て無条件で削除するのではなく、現行判定と許容範囲に合わせる。
- 出力findingに原文の絶対path、credential、任意の生payloadを出さない。表示用relative path、line number、pattern type、160文字を上限とする安全なcontextを維持する。
- `Check`は書き込まない。`Write`は同じ入力への再実行でbytes／mtimeを変えない。`Write + Check`は書込み後の内容を再確認する。

### ファイル・変更集合

- Node `TextDecoder("utf-8", { fatal: true })`等でinvalid UTF-8を拒否し、生の内容を診断出力しない。UTF-8 BOMの取り扱いを固定し、`Write`時のBOM除去と`Check`の検出結果を比較する。
- atomic writeはtemp fileとrename／backup／restore等で、失敗時に既存の原本を失わない契約を維持する。Windows上のrename／overwrite差、permission、cleanup failureをfixtureで確認する。単純な`writeFileSync(target)`置き換えは禁止する。
- ファイル列挙は明示scopeに限定し、`ChangedOnly`は既存のGit changed、staged、untracked集合を正しく扱う。`git ls-files`／diff等はNodeから引数配列で呼び出し、shell解釈させない。
- symlinkや実体path解決により許可scope外へ書き込まないことを確認する。既存PowerShellが明確に保証していない強化は現行動作との差分を明示し、無関係なroot restrictionを追加しない。
- 最終改行、CRLF/LF、読み取り内容、JSONLの追記境界を意図せず変更しない。

## 5. codex-task両OSの出力契約

1. `scripts/codex-task.ps1`の`Write-TaskLog`、`Write-TaskReport`、`Write-RunManifest`、`Initialize-EvaluationTemplate`、終了処理を列挙する。同様に`scripts/codex-task.sh`の`write_log`、`write_report`、`write_run_manifest`、evaluation作成、異常終了trapを列挙する。
2. JSON化・append・atomic writeに入る前に全ての出力文字列またはstructured valueを共通Node sanitizerへ通す。stdout/stderrや一時ファイルの生contentをtracked Run Artifactへコピーしない。
3. JSONL追記の並行書込みと一行単位を保持する。単純なRead→Rewriteをlogの毎行へ採用して競合や性能問題を増やさない。必要ならNode側へsanitized appendを実装し、既存append方式の排他・失敗契約と比較する。
4. 機械管理`run.json`のwriter/collector経路を改変せず、sanitization前提と最終gateを合わせる。Run Artifactのschemaやretentionを変更しない。
5. Run終了時には元のcodex/verify failureを保持しつつ、sanitizer failureを隠さず実行結果を不成功にする。sanitizer timeout／missing CLI／invalid UTF-8／原本復旧失敗の診断を安全に分類する。終了コードの具体的優先順位を既存PowerShellと合わせてcontract化する。
6. `Full Access`／`Approve for me`はinteractive権限選択であり、`codex-task` wrapperの既存preset・approval flagsを本Issueのために勝手に変更しない。sanitizationは双方で同一結果にする。

## 6. 実装手順

- [ ] 最新`main`の関連ファイル・全consumer・GitHub Actions・Run契約を再確認する。`qa-workflow-skills`の共通実装・fixture方針だけ参考にする。
- [ ] 現行PowerShell fixtureを実行し、golden input/output、exit code、finding、Git changed集合、mtime、原本復旧、性能上の基準を記録する。現在の環境でPowerShellがないケースは未検証と記録し、CI上のWindows／Ubuntu PowerShell fixtureと比較する。
- [ ] Node正本の機能単位（context、path variant、replace、residual、files、encoding、atomic write、finding）を設計し、同一fixtureからportable実装と旧PowerShell実装を比較する。
- [ ] 新Node CLIと互換PowerShell wrapperを実装し、置換、UTF-8、`ChangedOnly`、safe diagnostic、失敗時原本保持、二回目Write無変更を検証する。
- [ ] `codex-task.ps1`と`codex-task.sh`の各書込み前処理および終了時gateを共通Nodeに統合する。wrapper毎の出力・exit契約を比較する。
- [ ] `tests/contracts/codex-artifact-sanitization.test.ts`をOS間の実動作・consumer契約を検出できるものへ更新する。PowerShell symbolの有無だけに依存しない。fixtureはNodeの実行テストとしてOS非依存化する。
- [ ] `.github/workflows/ci.yml`のartifact gateをNodeへ切り替え、Ubuntu/Windows双方でNode fixture・`ChangedOnly`のCheck-only（Writeしない）を実行する。既存`--diff-filter=ACMRTUXB`とPR/pushの比較基準を保持する。sanitizerと無関係なPowerShell jobを削除しない。
- [ ] `.github/workflows/security-dependency-fallback.yml`と他の呼び出し元を検索し、sanitizer依存のみ置換する。既存Security fallbackのcredential、public log、protected branch、artifact契約に影響を与えない。
- [ ] `AGENTS.md`、`docs/reference/run-artifacts.md`、sanitizerを指す`docs/reference/*`、関連契約の入口コマンドを新正本へ同期する。歴史的Plan／Run Artifactは必要なく書き換えない。
- [ ] Node fixture、Windows compatibility fixture、`pnpm run test:contracts`、`pnpm run verify`、GitHub Actionsを実行する。Codespaces実機でPowerShellなしのWrite/Checkを確認し、未実施は明示する。

## 7. 重点回帰条件

| 検証 | 期待 |
| --- | --- |
| Windows／Ubuntuで同じfixture | 同じ入力でtoken、finding、残存、終了コードが一致 |
| Codespaces（`pwsh`不在） | Node CLIでWrite、Check可能 |
| `Check`でknown/unknown local path、BOM、invalid UTF-8を検出 | 対象原文やpathを漏らさず非0終了 |
| `Write`後の二度目`Write` | 内容、更新日時ともに不要な変更なし |
| 書込み・rename・backup・restore失敗 | 原本が保持されるか、保持不可の場合は安全に失敗を報告 |
| staging／untracked／changed text、binary同居 | `ChangedOnly`の選択と除外が現行契約と一致 |
| `codex-task.sh`／`codex-task.ps1`のlog/report/manifest/evaluation | 書込み前サニタイズ・JSON/JSONL形式・最終gateが等価 |
| codex/verifyの非0終了、sanitizerの別failure／timeout | 元のfailureを失わず、最終結果も成功扱いしない |
| CIのPR/push changed Run Artifact Check | LinuxでPowerShellなしに検査でき、Windowsでも同じ結果 |
| 権限モード選択 | Full Access／Approve for meのどちらでもSanitizerを省略しない |

## 8. リスク・対象外・rollback

- 現行PowerShell実装が大きく、path variantや原本復旧の境界を落としやすい。移植前の実fixtureとgolden比較を必須とする。
- Nodeをwrite前処理に起動する回数が多いと`codex-task`が極端に遅くなる可能性がある。実測して必要な範囲だけ最適化する。初期からqueue／daemon／新しいserviceを追加しない。
- `git diff`と`ls-files`の変化、NUL区切り、Windows path／case差分で`ChangedOnly`に欠落が発生するとsecurity gateが弱くなる。集合比較テストを追加する。
- `security-dependency-fallback`で非公開Alertやcredentialをログに出さない既存方針を維持する。本Issueのsanitizerを万能なsecret scannerと扱わない。
- #192のGit Hook、安全判断、defaultのFull Access/Approve for me設定そのものは対象外。Issue #188のdevcontainerへPowerShellを追加する回避も行わない。
- 回帰が出た場合は本branch上の変更を元へ戻し、旧PowerShell CLIへ戻せる互換入口を残す。破壊的Git操作やforce pushで復旧しない。
- 対象外: Windows固有Native toolingのLinux移植、Run Artifact保存形式変更、QA artifact graph導入、単なる見た目の修正。

## 9. 引き継ぎ・成果物

正本はこのPlan。実装者は関連Run Artifact／CI結果を確認し、変更ファイル・検証結果・実runtime未検証範囲・既知リスクを保存する。Plan保存とbranch作成だけでは実装完了扱いにしない。PR作成、merge、Issue closeは今回の作業範囲外。
