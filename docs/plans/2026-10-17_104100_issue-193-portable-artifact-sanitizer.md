# Issue #193: Run Artifact sanitizerをNode.jsへ統一し、Windows/Linux契約を揃えるPlan

## 0. 依頼概要

- 対象: [Issue #193](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/193)
- 作業branch: `issue-192-codex-git-workdir-guard`（Issue #192と共用。両Issueを同一ブランチ・同一PRで実装する）
- 参考: [qa-workflow-skills](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills)。特に既存CLI／scriptを単一の正本へ集め、固定入力・fixture・CIで保証する構成を参考にする。qa-workflow-skillsのartifact graphやQA SkillをこのRepositoryへ移植する作業ではない。
- 本変更はPlanのみ。sanitizer実装、PR作成、mergeは別作業。
- Codex利用者はFull Access／Approve for meのいずれも使用し得る。sanitizerの適用はCodex権限モードに依存させない。

- 実装とPRは[Issue #192のPlan](./2026-10-17_104100_issue-192-codex-git-workdir-guard.md)の「両Issue共通の実装・検証方針」に従う。#193のみを別PRで実装しない。

## 1. ゴールと完了条件

Run Artifact sanitizerの正本をOS非依存なNode.jsへ移し、PowerShell未導入のLinux/Codespacesからも`Write`／`Check`を実行できるようにする。未処理のローカル絶対パスを含むRun Artifactは、**Huskyのpre-commitでステージ済み内容を検査してコミットを拒否**し、既存のGitHub Actionsでも検出する。`codex-task.ps1`／`codex-task.sh`の終了時には共通Node実装による`Write`／`Check`を利用するが、全書込み前のsanitizeは新たな必須条件としない。

実装完了条件:
1. `node scripts/sanitize-codex-artifacts.mjs`をWindows／Linux/Codespacesで使用でき、`Write`、`Check`、両方指定、`ChangedOnly`、既存の明示path／alias／環境由来rootを扱える。
2. PowerShell実装の既存tokenと優先順位、Windows/Unix path variants、境界一致、URI／JSON escape、既知path置換、residual scan、BOM／invalid UTF-8、atomic write、findingの情報非漏えい、同一入力に対する二度目のWrite無変更を維持する。
3. Huskyのpre-commitは、Git indexにステージされた`.codex/runs/**`内の対象テキストの**blobそのもの**をNode版`Check`で検査し、既知／未知のローカル絶対パス、BOM、invalid UTF-8等があればコミットを拒否する。作業ディレクトリの内容だけを読んでPASSしない。検査はファイルを書き換えない。
4. `codex-task.ps1`／`codex-task.sh`はRun終了時の`Write`／`Check`を同じNode実装から利用する。正常終了／異常終了／sanitizer失敗／timeout時の終了状態を区別し、sanitizer失敗を成功扱いしない。各書込み経路への逐次Node呼出しは追加しない。
5. Ubuntu／Windowsで同じNode fixtureとCLI contractを実行し、既存PowerShell fixtureによるgolden確認と比較する。既存CIのchanged Run Artifact gateはNode版`Check`で実行し、PowerShellインストールを前提にしない。Huskyの追加に伴う既存contract testも更新する。
6. `pnpm run verify`、focused tests、関連GitHub Actionsが最終HEADで成功する。Codespaces実機のWrite／CheckとCodex runtimeでの動作は、静的テストのPASSと区別する。

## 2. 現状と根拠

- `scripts/lib/codex-artifact-sanitizer.ps1`は約950行で、`New-CodexArtifactSanitizerContext`、path variant、置換、残存検出、`ChangedOnly`、UTF-8読み取り、atomic write、line appendを担当する。
- `scripts/sanitize-codex-artifacts.ps1`は`-Write`／`-Check`／`-RepositoryAlias`／環境別root／`-ChangedOnly`を受け付けるCLI。異常時に安全なfindingのみ表示する。
- `scripts/tests/codex-artifact-sanitizer.test.ps1`にはWindows／Linux root、PATH置換の境界、JSON escape、URI、既知path、残存検出、UTF-8、原本保全、`ChangedOnly`、二度目のWrite等の実動作fixtureがある。
- `tests/contracts/codex-artifact-sanitization.test.ts`はPowerShell symbol文字列を前提にした静的確認を含む。機能移行後は実動作contract中心へ切り替える必要がある。
- `scripts/codex-task.ps1`は共通PowerShell sanitizerをdot-sourceし、Log／Report／Manifest／Evaluationを出力前に処理する。終了時`Invoke-CodexRunArtifactSanitization`から`-Write`／`-Check`を行う。この逐次書込み前処理は今回の移植で維持必須とはしない。
- `scripts/codex-task.sh`は`write_log`、`write_report`、`write_run_manifest`、evaluation template等で出力するが共通sanitizerの処理経路を持たない。終了時の同等gateもない。
- 両`codex-task`は`codex exec --output-last-message`の保存先を直接渡す。`run_id`指定時は`.codex/runs/<run_id>/artifacts/`配下となるため、Run全体の最終`Write`／`Check`とコミット前のステージ済み検査の対象に含める。
- `scripts/collect-run-artifacts.py`も`run.json`を直接書き込む。今回の方針ではcollectorの書込み前処理は増やさず、最終`Write`／`Check`とコミット前の検査で扱う。
- `.github/workflows/ci.yml`の`codex-artifact-sanitization` jobはUbuntu/Windows matrixながら`shell: pwsh`と`scripts/tests/codex-artifact-sanitizer.test.ps1`を使用する。
- 既存`.husky/pre-commit`は`pnpm run quality:staged`と`pnpm run security:check`を実行する。`scripts/pre-commit-quality-check.mjs`はGit indexのstage 0 blobを読む既存の参考経路である。`tests/contracts/husky-config.test.ts`は現在のHook内容を完全一致で検証している。
- `.github/workflows/security-dependency-fallback.yml`を含め、その他の`pwsh`／`powershell`呼び出しを網羅的に調査してsanitizer依存のみ置き換える。Windows固有スクリプトは対象外。
- #188のCodespacesでは`pwsh`がないため、既存CLIを同じcheckoutで実行できなかった。

## 3. 方針と正本構成

- 正本: `scripts/lib/codex-artifact-sanitizer.mjs`。Node.js 24の標準ライブラリとRepository既存依存で実装し、新しいnpm dependencyは追加しない。
- CLI: `scripts/sanitize-codex-artifacts.mjs`。`--path`（複数指定可能）、`--write`、`--check`、`--changed-only`、`--repository-alias`（複数）、`--virtual-store-dir`、`--android-sdk-root`、`--java-home`、`--maestro-home`のような明示argvへ対応する。加えてコミット前検査専用に`--staged --check`を設ける。`--staged`は`--changed-only`と混同せず、Git index上のblobを**読み取り専用**で検査し、`--write`との併用は拒否する。既存呼び出しを網羅し、Windows互換wrapperの既存引数契約を残す。
- PowerShell互換入口: `scripts/sanitize-codex-artifacts.ps1`。既存利用者の`-Path`、`-Write`、`-Check`等を受け付け、変換してNode CLIを起動する薄いwrapperにする。置換・残存検出等の独立実装を残さない。Nodeのexit codeを正しく伝播する。
- Linux/macOSは`node scripts/sanitize-codex-artifacts.mjs`を標準入口とし、追加の`.sh` wrapperが本当に必要なconsumerがある場合に限り作成する。
- `codex-task.ps1`／`codex-task.sh`のRun終了時処理は共通Node正本を呼ぶ。従来のPowerShell側の逐次書込み前サニタイズに依存する処理は、通常のJSON／JSONL書込みへ整理し、同機能をNodeプロセスで書込みごとに再実装しない。PowerShell側へpath sanitizerロジックを二重実装しない。
- `.husky/pre-commit`には既存の2つの検査に加え、ステージ済みRun ArtifactのNode版`Check`を1回追加する。既存の`quality:staged`が行うGit index読取りの方法は参考にするが、品質検査器にSanitizer固有のロジックを重複実装しない。
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
- pre-commit用`--staged --check`では、`git diff --cached --name-only -z --diff-filter=ACMR`で得た`.codex/runs/**`の対象テキストを、`git ls-files --stage -z`のstage 0 blob OIDと照合し、`git cat-file blob <OID>`で取得した**ステージ済みbytes**を検査する。rename／空白・Unicodeを含むファイル名／部分stage／削除／未マージentry／Git失敗を扱い、解釈不能時は失敗する。ステージ済み内容もworktreeも自動修正しない。Run Artifactがステージされていなければ正常終了する。
- symlinkや実体path解決により許可scope外へ書き込まないことを確認する。既存PowerShellが明確に保証していない強化は現行動作との差分を明示し、無関係なroot restrictionを追加しない。
- 最終改行、CRLF/LF、読み取り内容、JSONLの追記境界を意図せず変更しない。

## 5. 書込みとコミット前検査の責務

1. `codex-task.ps1`／`codex-task.sh`のLog／Report／Manifest／Evaluation、`--output-last-message`、collectorによる`run.json`更新を確認する。これらの**ローカル書込み前**にサニタイズすることは本Issueの必須条件から外す。未サニタイズ内容が作業ディレクトリやGit indexへ存在し得ることは認めるが、コミット前の`Check`で検出する。
2. 既存PowerShell共通ライブラリの廃止に伴い、`codex-task.ps1`の書込み処理を必要な範囲だけ整理する。`codex-task.sh`も同様に、JSON／JSONLの形式、追記の一行単位、Manifestの機械管理、既存の終了コードを維持する。逐次Nodeプロセス起動や一時出力ファイルへの強制リダイレクトは追加しない。
3. 両`codex-task`はRun終了時にNode CLIでRun root全体の`Write`→`Check`を実行する。通常終了・Codex失敗・verify失敗のどれでも実行される制御経路に置き、sanitizer失敗を成功として報告しない。元の失敗終了コードは上書きせず、追加のsanitizer失敗を診断情報に残す。Run rootがない既存非Run経路の扱いは保持する。
4. ユーザーが直接編集する`PLAN.md`／`TASKS.md`／`REPORT.md`や、他のwriterが更新する`run.json`は終了時処理だけでは保証できない。コミット時にGit index上のRun Artifactを**全て**`Check`する。`Write`は必要なら明示実行し、その後`git add`をやり直す。Huskyは自動的にWorktree・indexを書き換えない。
5. CIではPR／pushの変更されたRun ArtifactをNode版`Check`で検査する。Husky回避・未導入環境も想定するが、**CIはpush後の検査であり、送信自体を防げない**。secret／tokenの網羅的な検出も本サニタイザーの保証外とし、生の機密ログは既存方針どおりGit管理対象外へ保存する。
6. Full Access／Approve for meの選択や`codex-task` wrapperの既存preset・approval flagsは変更しない。手動Write／Check、Husky、CIはどちらの権限モードでも同一の契約に従う。

## 6. 実装手順

- [ ] 最新`main`の関連ファイル・全consumer・GitHub Actions・Husky・Run契約を再確認する。#192との共通変更を整理する。
- [ ] 現行PowerShell fixtureを実行し、golden input/output、exit code、finding、Git changed集合、mtime、原本復旧の期待を固定する。実行環境にPowerShellがなければ未検証とし、CI上の既存fixtureと比較する。
- [ ] Node正本の機能単位（context、path variant、replace、residual、files、encoding、atomic write、finding）を既存fixtureに沿って移植する。新規dependencyや別OS向け同機能の二重実装は追加しない。
- [ ] 新Node CLI、互換PowerShell wrapper、`--staged --check`を実装する。既存`Write`／`Check`／`ChangedOnly`の互換性と、Git indexのstage 0 blobを正しく読む動作を検証する。
- [ ] `.husky/pre-commit`へRun Artifactのstage済み`Check`を追加する。`tests/contracts/husky-config.test.ts`の既存2検査の順序契約を必要な範囲で更新し、新チェックがなくてもPASSになるようなテスト緩和はしない。
- [ ] `codex-task.ps1`のPowerShell sanitizer依存を書込み前の重複実装なしに整理し、`codex-task.sh`とともに最終Node `Write`／`Check`へ接続する。`collect-run-artifacts.py`のManifest schema／集約処理や`--output-last-message`の保存方法は変更しない。
- [ ] `tests/contracts/codex-artifact-sanitization.test.ts`をOS間の実動作・Run終了時検査・Huskyのstage済み検査を確認できるものへ更新する。PowerShell symbolの有無だけに依存しない。
- [ ] `.github/workflows/ci.yml`の既存changed Run Artifact gateをNode版Check-onlyへ切り替える。Ubuntu／Windowsで同じfixtureを実行し、従来の`--diff-filter=ACMRTUXB`とPR/pushの比較基準を維持する。
- [ ] `.github/workflows/security-dependency-fallback.yml`を含むsanitizer呼び出しを検索し、sanitizer依存のみ置換する。無関係なPowerShell利用やsecret保護の扱いを変更しない。
- [ ] `AGENTS.md`、`docs/reference/run-artifacts.md`、sanitizerを指す既存文書と関連contractを新しいコミット前／CI契約に同期する。歴史的PlanやRun Artifactを書き換えない。
- [ ] focused fixture・Husky contract・`pnpm run test:contracts`・`pnpm run verify`・関連GitHub Actionsを確認する。Codespaces実機のWrite／Checkは実行可能なら行い、未実施をPASSとしない。

## 7. 重点回帰条件

| 検証 | 期待 |
| --- | --- |
| Windows／Ubuntuで同じfixture | 同じ入力でtoken、finding、残存、終了コードが一致 |
| Codespaces（`pwsh`不在） | Node CLIのWrite／Checkが実行可能 |
| 既知／未知の絶対path、BOM、invalid UTF-8 | `Check`で検出し、対象原文やpathを診断へ漏らさない |
| `Write`後の二度目`Write` | 内容、mtimeを不要に変更しない |
| 書込み・rename・backup・restore失敗 | 原本保持、または保持不能を安全に報告 |
| `ChangedOnly`のstaged／untracked／changed textとbinary同居 | 既存CLIの選択と除外が現行契約に一致 |
| Git indexのstage 0 blobに未サニタイズpath、worktreeは修正済み | Huskyが**stageされた旧blob**を検出してコミットを拒否 |
| Git indexのblobは安全、worktreeだけ未サニタイズ／部分stage | stage済み内容の判定を優先。worktreeの不一致を理由に誤判定しない |
| indexでrename／削除／未マージentry／空白・Unicode path／Gitエラー | 対象scopeで正しいblobを検査し、不明・破損時は安全側に失敗 |
| stage済みRun Artifactなし | 新しいpre-commitチェックは無用な拒否をしない |
| `codex-task.sh`／`codex-task.ps1`のlog/report/manifest/evaluation、Codex出力 | JSON／JSONL形式を維持し、終了時のRun全体Write→Checkが機能 |
| codex／verifyの非0終了、sanitizer失敗／timeout | 既存の主失敗を隠さず、sanitizer失敗も成功扱いしない |
| CIのPR/push changed Run Artifact Check | LinuxでPowerShellなしに検査でき、Windowsでも同じ結果。Huskyを回避した不正内容も検出 |
| 権限モード選択 | Full Access／Approve for meのいずれもSanitizer／commit gateを省略する理由としない |

## 8. リスク・対象外・rollback

- 現行PowerShell実装が大きく、path variantや原本復旧の境界を落としやすい。移植前の実fixtureとgolden比較を必須とする。
- 全書込み前サニタイズを撤廃するため、ローカルの未処理Run Artifactやステージ済みblobが一時的に存在する。Huskyは`--no-verify`／`HUSKY=0`等で回避可能であり、CIはGitHubへ送信済みの内容しか検査できない。**GitHubへ不正内容が送信されない保証はない**ことを明記する。秘密値を含む生ログ等はGit管理外に保存する。
- 同じNode sanitizerをLog追記のたびに起動する設計は採用しない。Run終了時の一括処理とコミット前のステージ済みCheckで足りる範囲に限定する。
- `git diff`と`ls-files`の変化、NUL区切り、Windows path／case差分で`ChangedOnly`に欠落が発生するとsecurity gateが弱くなる。集合比較テストを追加する。
- `security-dependency-fallback`で非公開Alertやcredentialをログに出さない既存方針を維持する。本Issueのsanitizerを万能なsecret scannerと扱わない。
- #192のGit Hook、安全判断、defaultのFull Access/Approve for me設定そのものは対象外。Issue #188のdevcontainerへPowerShellを追加する回避も行わない。
- `--staged --check`と既存`--changed-only`を混同すると、worktree修正済み・stage未更新の不正blobを見落とす。Git indexを正本としたテストを必須とする。
- 回帰が出た場合は本branch上の変更を元へ戻し、旧PowerShell実装へ戻せるよう変更前のcommitと移行fixtureを残す。Node移行後の薄いPowerShell互換入口だけで旧実装へ切り替えられるとは仮定しない。破壊的Git操作やforce pushで復旧しない。
- 対象外: Windows固有Native toolingのLinux移植、Run Artifact保存形式変更、QA artifact graph導入、単なる見た目の修正。

## 9. 引き継ぎ・成果物

正本はこのPlan。実装者は関連Run Artifact／CI結果を確認し、変更ファイル・検証結果・実runtime未検証範囲・既知リスクを保存する。Plan保存とbranch作成だけでは実装完了扱いにしない。PR作成、merge、Issue closeは今回の作業範囲外。
