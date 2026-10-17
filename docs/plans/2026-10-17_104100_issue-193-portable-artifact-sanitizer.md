# Run Artifactサニタイザー改善Plan：Node.jsへの統一とコミット前検査

## 目的

Windows、Linux、Codespacesで同じRun Artifactサニタイザーを利用する。既存のパス置換・残存検出・ファイル保護を維持しつつ、`.codex/runs/**`と標準の`.codex/artifacts/**`、`.codex/reports/**`、`.codex/logs/**`にコミットされる対象テキストをHuskyで検査し、CIでも同じ内容を再検査する。明示された任意の出力先はwrapper終了時に検査するが、これらのGit管理下の範囲外をHusky／CIが無条件に網羅するとは扱わない。

- 背景：[Issue #193](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/193)、CodespacesでのPowerShell不在。Issue本文の「全書込み前サニタイズ必須」は今回合意した**コミット前検査中心**の方針に置き換える。実装と受入は本Planを基準とする。
- 作業branch：`issue-192-codex-git-workdir-guard`。[Git安全性のPlan](./2026-10-17_104100_issue-192-codex-git-workdir-guard.md)と共用し、実装PRは1件にまとめる。
- 今回はPlanのみ更新し、コード・Issue・PRは変更しない。

## 現状

- 正本は`scripts/lib/codex-artifact-sanitizer.ps1`、CLIは`scripts/sanitize-codex-artifacts.ps1`。Windows／Linuxの既存fixtureは`scripts/tests/codex-artifact-sanitizer.test.ps1`にある。
- `scripts/codex-task.ps1`は書込み前処理と終了時の`Write`／`Check`を持つが、`scripts/codex-task.sh`には同等の共通サニタイザー呼出しがない。`--output-last-message`や`collect-run-artifacts.py`もRun Artifactを直接書き込む。
- 両wrapperは`--run-id`なしで実行でき、この場合`run_root`は空で、既定の出力先は`.codex/artifacts/`、`.codex/reports/`、`.codex/logs/`となる。`--run-id`ありでも`--output-file`／`--report-path`／`--log-path`でRun root外を指定できる。現行PowerShellの終了時サニタイズは`RunRoot`が空だと何も検査しないため、書込み前処理の撤廃に合わせて終了時の対象を明示する必要がある。
- `.husky/pre-commit`は既存の`quality:staged`、`security:check`を実行する。`scripts/pre-commit-quality-check.mjs`にはGit indexのstage 0 blobを検査する既存の方法がある。
- `.github/workflows/ci.yml`の`codex-artifact-sanitization` jobはUbuntu／WindowsでPowerShellを呼ぶが、Node.js 24を明示していない。変更ファイル検出は`--diff-filter=ACMRTUXB`を使用し、現状は`Test-Path`を通過したworktreeファイルを検査する。コミット済みGit blobのmodeを確認していない。
- `.github/workflows/security-dependency-fallback.yml`は、Run Artifactの3ファイルに対して`scripts/sanitize-codex-artifacts.ps1`を`pwsh`で`Write`／`Check`していることを確認済み。この既知の呼び出し元もNode移行の対象となる。

## 実装方針

### 1. サニタイザーの共通化

- `scripts/lib/codex-artifact-sanitizer.mjs`を共通実装、`scripts/sanitize-codex-artifacts.mjs`をCLIとする。Node.js 24の標準ライブラリを基本とし、新しい依存関係を原則追加しない。
- CLIは既存の`Write`、`Check`、`ChangedOnly`、明示path／repository alias／環境由来rootを扱う。PowerShell CLIは既存引数を受け取ってNodeへ渡す薄い互換入口にする。必要な利用元がない限り追加のBash wrapperは作らない。
- 既存fixtureを基準として、`<REPO_ROOT>`、`<USER_HOME>`等のtoken、Windows／Unix path、URI／JSON escape、prefix境界、未知の絶対パス検出、findingの非漏えいを維持する。対象は従来の`.md`、`.json`、`.jsonl`、`.txt`。
- 不正UTF-8とBOM、改行、原本を失わないatomic write、`Write`の二度目の無変更、`Check`の読取り専用動作を維持する。無関係なファイル・バイナリへ検査範囲を拡大しない。
- `ChangedOnly`は既存どおり作業ディレクトリのGit変更集合を扱い、後述のコミット前専用`--staged`とは区別する。

### 2. Huskyは実際にコミットする内容を検査する

- `node scripts/sanitize-codex-artifacts.mjs --staged --check`を設ける。`--staged`は`--write`と併用不可とし、worktreeやGit indexを書き換えない。
- Git indexの`.codex/runs/**`と標準の`.codex/artifacts/**`、`.codex/reports/**`、`.codex/logs/**`に属する対象テキストをNUL区切りで列挙し、`git ls-files --stage -z`から得たstage 0 blobを`git cat-file blob`で読み込んで検査する。`scripts/pre-commit-quality-check.mjs`の既存手法を参考にするが、品質検査器へサニタイザー処理を重複実装しない。
- `git diff --cached --name-only -z --diff-filter=ACMRTUXB`等で**型変更(`T`)を含める**。対象Run Artifactのsymlink（mode `120000`）、gitlink、unmerged entry、blob取得不能は安全に拒否する。通常のstage 0テキストだけを検査し、リンク先を辿らない。対象外ファイル・削除済みファイルは誤って読み込まない。
- 部分stage、worktreeだけ修正済み、rename、空白・Unicodeを含むpath、初回commitなどをテストし、Git index側に不正なblobがあればHuskyが拒否することを確認する。
- `.husky/pre-commit`には既存の2検査を維持したままこのCheckを1回追加し、`tests/contracts/husky-config.test.ts`の完全一致契約を更新する。Huskyは自動`Write`や`git add`を行わない。修正時は利用者が`Write`後に再stageする。

### 3. Run終了時とCIの共通化

- `codex-task.ps1`と`codex-task.sh`の終了時には同じNode CLIで`Write`→`Check`を実行する。**対象はRun root（存在する場合）に加え、実際に使用した`output_file`、`report_path`、`log_path`、Manifest／Evaluation等の既知の出力先**とし、重複パスは除く。`--run-id`なし、Run root外への明示出力も対象に含める。対象外の任意ディレクトリを再帰走査しない。
- 正常終了・Codex失敗・verify失敗・`fail_with_status`／`Fail-Task`などの終了経路を通る共通後処理に置く。Bashの`exit`分岐を取りこぼさないよう`EXIT` trap等を既存構造に合わせて導入し、PowerShellの`finally`と同じ出力範囲を検査する。sanitizer失敗は成功扱いせず、元の非0終了理由を上書きしない。元が成功でsanitizerが失敗した場合は非0終了とする。
- Log／Report／Manifest／Evaluation、`--output-last-message`、`run.json`の各書込み前にNodeを起動する処理は追加しない。既存PowerShell側の逐次サニタイズは共通実装への移行に合わせて除去する。JSON／JSONL形式、Manifestのschema、追記処理は維持する。
- Codexやユーザーが直接編集するRun Artifactについて、上記の**固定したGit対象パス内**にステージされた対象テキストはHuskyで検査する。任意の明示出力先やRun終了後の手動編集まですべてHuskyが保護するとは扱わない。ローカルの一時的な未処理内容を完全に防ぐものではない。
- `.github/workflows/ci.yml`の既存`codex-artifact-sanitization` jobで**`actions/setup-node`を使用してNode.js 24を明示**し、Ubuntu／WindowsでNode fixtureとコミット済みRun Artifactの`Check`を実施する。
- CI専用の`--committed --check --base-ref <base>`を設ける。現行CIのPR／pushにおける比較基準と`git diff --name-only -z --diff-filter=ACMRTUXB <base>...HEAD -- <対象パス>`を維持し、選択した各パスの**`HEAD`のGit treeのmode／object ID**を`git ls-tree -z HEAD -- <path>`等で取得する。通常blobは`git cat-file blob <OID>`から読んで共通のテキスト検査処理へ渡し、symlink／gitlink／object取得失敗を拒否する。削除済みパスは検査対象から除く。ステージ差分のないCIで`--staged --check`を単純に呼び出して成功扱いにしない。
- `--staged`と`--committed`はファイル選択だけを分け、blobのmode判定とサニタイズ検査は同じNode実装を使う。CI fixtureで、通常テキスト・未処理パス・symlink・型変更を含むコミット済みtreeを検査する。CI専用の別エンジンやworkflowは作らない。

## 変更対象

- `scripts/lib/codex-artifact-sanitizer.ps1`、`scripts/sanitize-codex-artifacts.ps1`：既存正本の移行と互換入口。
- `scripts/lib/codex-artifact-sanitizer.mjs`、`scripts/sanitize-codex-artifacts.mjs`：共通実装とCLI。
- `scripts/codex-task.ps1`、`scripts/codex-task.sh`：Run終了時の共通`Write`／`Check`。
- `.husky/pre-commit`、`tests/contracts/husky-config.test.ts`：stage済み検査の追加。
- `scripts/tests/codex-artifact-sanitizer.test.ps1`、`tests/contracts/codex-artifact-sanitization.test.ts`：既存fixtureの比較とNodeの動作テスト。
- `.github/workflows/ci.yml`：Node.js 24の導入と既存jobのHEAD blob検査への切替。
- `.github/workflows/security-dependency-fallback.yml`：既知のPowerShell CLI呼出し2箇所を、既存Node setupを利用したNode CLIの`--path`指定`Write`／`Check`へ置き換える。生成内容・認可・その他のセキュリティ処理は変更しない。
- `AGENTS.md`、`docs/reference/run-artifacts.md`等：変更した実際の利用手順とGitの検査対象範囲のみ同期する。新しいRun Artifact保存形式は追加しない。

## 実装と検証

1. 既存PowerShell fixtureとCLIの実際の入出力・終了コード・原本保全を確認し、Node移植の比較基準を固定する。
2. Node CLIへ移植し、PowerShell互換入口を薄くする。既存fixtureをNodeで再現し、Windows／Ubuntuで同じ結果になることを確認する。
3. `--staged --check`とHuskyを追加し、Run IDあり／なしの既定のGit対象パス、不正なstage 0 blob、型変更、symlink、部分stage、Gitエラーがコミット前に拒否されることをテストする。
4. 両`codex-task`でRun IDあり／なし、標準／明示出力先、正常終了／Codex失敗／verify失敗を検証し、共通後処理が全ての既知出力を`Write`→`Check`することと終了コード／JSON・JSONL形式を確認する。Run root外の明示出力はそのファイルだけを処理する。
5. 既存CI jobで`--committed --check`を使用し、HEADのGit blobとmodeを検査する。`security-dependency-fallback.yml`の既知の2呼出しもNode CLIへ移して動作を確認する。
6. `pnpm run test:contracts`、関連fixture、`pnpm run verify`、Ubuntu／Windowsの関連CIを確認する。Codespaces実機での`Write`／`Check`が未実施なら未検証と記録する。

## 完了条件

| 検証 | 期待 |
| --- | --- |
| Node CLIの`Write`／`Check` | Windows／Linuxで動き、既存の置換・検出結果と一致 |
| UTF-8／BOM／atomic write | 不正入力を安全に拒否し、失敗時に原本を保護 |
| Huskyのstage済みRun Artifact | Run IDあり／なしの既定Git対象パスでstage 0 blobを検査。不正path、symlink、型変更等でコミット拒否 |
| `codex-task.ps1`／`.sh` | Run IDあり／なし、明示出力先、各終了経路で既知の全出力を`Write`→`Check`。終了コードとJSON／JSONL契約が一致 |
| GitHub Actions | Node.js 24固定。Ubuntu／WindowsでHEADのblob／modeを検査し、不正テキストとsymlink／型変更を拒否。security fallbackもNode CLIを使用 |
| 回帰検証 | 関連テスト、`pnpm run verify`、CIが成功 |

Huskyは`--no-verify`等で回避でき、CIはpush後の検査となる。**GitHubへの送信自体を防ぐ保証はない**。このサニタイザーは秘密情報を網羅的に検出するものではないため、生の機密ログはGit管理対象外とする。改修による回帰が発生した場合は変更を戻す。force push、branch削除、merge、Issue closeは対象外。
