# Run Artifactサニタイザー改善Plan：Node.jsへの統一とコミット前検査

## 目的

Windows、Linux、Codespacesで同じRun Artifactサニタイザーを利用する。既存のパス置換・残存検出・ファイル保護を維持しつつ、コミットされるRun Artifactに未処理のローカル絶対パスがないことをHuskyで検査し、CIでも再検査する。

- 背景：[Issue #193](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/193)、CodespacesでのPowerShell不在。Issue本文の「全書込み前サニタイズ必須」は今回合意した**コミット前検査中心**の方針に置き換える。実装と受入は本Planを基準とする。
- 作業branch：`issue-192-codex-git-workdir-guard`。[Git安全性のPlan](./2026-10-17_104100_issue-192-codex-git-workdir-guard.md)と共用し、実装PRは1件にまとめる。
- 今回はPlanのみ更新し、コード・Issue・PRは変更しない。

## 現状

- 正本は`scripts/lib/codex-artifact-sanitizer.ps1`、CLIは`scripts/sanitize-codex-artifacts.ps1`。Windows／Linuxの既存fixtureは`scripts/tests/codex-artifact-sanitizer.test.ps1`にある。
- `scripts/codex-task.ps1`は書込み前処理と終了時の`Write`／`Check`を持つが、`scripts/codex-task.sh`には同等の共通サニタイザー呼出しがない。`--output-last-message`や`collect-run-artifacts.py`もRun Artifactを直接書き込む。
- `.husky/pre-commit`は既存の`quality:staged`、`security:check`を実行する。`scripts/pre-commit-quality-check.mjs`にはGit indexのstage 0 blobを検査する既存の方法がある。
- `.github/workflows/ci.yml`の`codex-artifact-sanitization` jobはUbuntu／WindowsでPowerShellを呼ぶが、Node.js 24を明示していない。変更ファイル検出は`--diff-filter=ACMRTUXB`を使用する。

## 実装方針

### 1. サニタイザーの共通化

- `scripts/lib/codex-artifact-sanitizer.mjs`を共通実装、`scripts/sanitize-codex-artifacts.mjs`をCLIとする。Node.js 24の標準ライブラリを基本とし、新しい依存関係を原則追加しない。
- CLIは既存の`Write`、`Check`、`ChangedOnly`、明示path／repository alias／環境由来rootを扱う。PowerShell CLIは既存引数を受け取ってNodeへ渡す薄い互換入口にする。必要な利用元がない限り追加のBash wrapperは作らない。
- 既存fixtureを基準として、`<REPO_ROOT>`、`<USER_HOME>`等のtoken、Windows／Unix path、URI／JSON escape、prefix境界、未知の絶対パス検出、findingの非漏えいを維持する。対象は従来の`.md`、`.json`、`.jsonl`、`.txt`。
- 不正UTF-8とBOM、改行、原本を失わないatomic write、`Write`の二度目の無変更、`Check`の読取り専用動作を維持する。無関係なファイル・バイナリへ検査範囲を拡大しない。
- `ChangedOnly`は既存どおり作業ディレクトリのGit変更集合を扱い、後述のコミット前専用`--staged`とは区別する。

### 2. Huskyは実際にコミットする内容を検査する

- `node scripts/sanitize-codex-artifacts.mjs --staged --check`を設ける。`--staged`は`--write`と併用不可とし、worktreeやGit indexを書き換えない。
- Git indexの`.codex/runs/**`に属する対象テキストをNUL区切りで列挙し、`git ls-files --stage -z`から得たstage 0 blobを`git cat-file blob`で読み込んで検査する。`scripts/pre-commit-quality-check.mjs`と同じ既存手法を参考にするが、品質検査器へサニタイザー処理を重複実装しない。
- `git diff --cached --name-only -z --diff-filter=ACMRTUXB`等で**型変更(`T`)を含める**。対象Run Artifactのsymlink（mode `120000`）、gitlink、unmerged entry、blob取得不能は安全に拒否する。通常のstage 0テキストだけを検査し、リンク先を辿らない。対象外ファイル・削除済みファイルは誤って読み込まない。
- 部分stage、worktreeだけ修正済み、rename、空白・Unicodeを含むpath、初回commitなどをテストし、Git index側に不正なblobがあればHuskyが拒否することを確認する。
- `.husky/pre-commit`には既存の2検査を維持したままこのCheckを1回追加し、`tests/contracts/husky-config.test.ts`の完全一致契約を更新する。Huskyは自動`Write`や`git add`を行わない。修正時は利用者が`Write`後に再stageする。

### 3. Run終了時とCIの共通化

- `codex-task.ps1`と`codex-task.sh`のRun終了時に同じNode CLIで対象Run rootの`Write`→`Check`を実行する。正常終了・Codex失敗・verify失敗のいずれでも通る制御経路に置く。sanitizer失敗は成功扱いせず、元の失敗理由も隠さない。
- Log／Report／Manifest／Evaluation、`--output-last-message`、`run.json`の各書込み前にNodeを起動する処理は追加しない。既存PowerShell側の逐次サニタイズは共通実装への移行に合わせて除去する。JSON／JSONL形式、Manifestのschema、追記処理は維持する。
- Codexやユーザーが直接編集するRun Artifactを含め、最終的なGit index上の内容はHuskyで検査する。ローカルの一時的な未処理内容を完全に防ぐものではない。
- `.github/workflows/ci.yml`の既存`codex-artifact-sanitization` jobで**`actions/setup-node`を使用してNode.js 24を明示**し、Ubuntu／WindowsでNode fixtureとchanged Run Artifactの`Check`を実施する。従来のPR／push比較基準と`--diff-filter=ACMRTUXB`を維持し、symlink・型変更の拒否も確認する。sanitizerと無関係なPowerShell jobは変更しない。

## 変更対象

- `scripts/lib/codex-artifact-sanitizer.ps1`、`scripts/sanitize-codex-artifacts.ps1`：既存正本の移行と互換入口。
- `scripts/lib/codex-artifact-sanitizer.mjs`、`scripts/sanitize-codex-artifacts.mjs`：共通実装とCLI。
- `scripts/codex-task.ps1`、`scripts/codex-task.sh`：Run終了時の共通`Write`／`Check`。
- `.husky/pre-commit`、`tests/contracts/husky-config.test.ts`：stage済み検査の追加。
- `scripts/tests/codex-artifact-sanitizer.test.ps1`、`tests/contracts/codex-artifact-sanitization.test.ts`：既存fixtureの比較とNodeの動作テスト。
- `.github/workflows/ci.yml`：Node.js 24の導入と既存jobの切替。
- `AGENTS.md`、`docs/reference/run-artifacts.md`等：変更した実際の利用手順のみ更新。`security-dependency-fallback.yml`はsanitizerへの依存があった場合だけ修正する。

## 実装と検証

1. 既存PowerShell fixtureとCLIの実際の入出力・終了コード・原本保全を確認し、Node移植の比較基準を固定する。
2. Node CLIへ移植し、PowerShell互換入口を薄くする。既存fixtureをNodeで再現し、Windows／Ubuntuで同じ結果になることを確認する。
3. `--staged --check`とHuskyを追加し、不正なstage 0 blob、型変更、symlink、部分stage、Gitエラーがコミット前に拒否されることをテストする。
4. 両`codex-task`の終了処理と既存CI jobを共通Node実装へ切り替える。失敗時の終了状態とJSON／JSONL形式を確認する。
5. `pnpm run test:contracts`、関連fixture、`pnpm run verify`、Ubuntu／Windowsの関連CIを確認する。Codespaces実機での`Write`／`Check`が未実施なら未検証と記録する。

## 完了条件

| 検証 | 期待 |
| --- | --- |
| Node CLIの`Write`／`Check` | Windows／Linuxで動き、既存の置換・検出結果と一致 |
| UTF-8／BOM／atomic write | 不正入力を安全に拒否し、失敗時に原本を保護 |
| Huskyのstage済みRun Artifact | stage 0 blobを検査。不正path、symlink、型変更等でコミット拒否 |
| `codex-task.ps1`／`.sh` | Run終了時の`Write`→`Check`、終了コード、JSON／JSONL契約が一致 |
| GitHub Actions | Node.js 24固定でUbuntu／Windowsの検査に成功。PowerShellへの依存なし |
| 回帰検証 | 関連テスト、`pnpm run verify`、CIが成功 |

Huskyは`--no-verify`等で回避でき、CIはpush後の検査となる。**GitHubへの送信自体を防ぐ保証はない**。このサニタイザーは秘密情報を網羅的に検出するものではないため、生の機密ログはGit管理対象外とする。改修による回帰が発生した場合は変更を戻す。force push、branch削除、merge、Issue closeは対象外。
