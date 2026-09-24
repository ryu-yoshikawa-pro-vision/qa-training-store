# Tasks（タスク）

## Now（現在）

- [x] 1. RepositoryのCI lifecycle正本とroot導線を確認する。
- [x] 2. Bash / PowerShell verifyのsemantic contractを確認する。
- [x] 3. GitHub CLIのwatch / fail-fastと0 checks時の挙動を確認する。
- [x] 4. 実装対象を正本文書 + Bash / PowerShell verifyへ限定する。
- [x] 5. 保存Planを作成する。
- [x] 6. Plan-only Run Artifactを確定する。
- [x] 7. Planをcommitし、PRを作成する。

## 完了処理の参照先

- 基本Progressの分母・表記: `docs/reference/run-artifacts.md`
- plan-onlyのためfile-changing taskのCI連動Progressは適用しない。
- Git branch / refspec / recoveryの詳細: `docs/reference/git-branch-safety.md`

## Discovered（発見事項）

- `scripts/verify` と `scripts/verify.ps1` が現在のpolling禁止文言をliteralで固定している。
- `gh pr checks --watch` はcheck 0件の状態では待機せずerrorになるため、bounded registration waitが必要。

## Blocked（ブロック中）

- なし。
