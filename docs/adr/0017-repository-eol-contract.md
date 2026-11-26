# ADR-0017: リポジトリ管理ファイルのLF契約

- Status: Accepted
- Date: 2026-08-17

## Context

Windows環境では、Gitのglobal `core.autocrlf`設定やブランチ切替のタイミングによって、同じリポジトリのテキストファイルにCRLF／LF差分が発生し、`format:check`や`verify`が失敗する可能性がある。既存の設定はGitの自動判定に依存しており、checkout時のEOL契約がリポジトリ内で明示されていなかった。

## Decision

1. `.gitattributes`で`* text=auto eol=lf`を指定し、Git管理下のテキストファイルはcheckout時もLFとする。global Git設定は変更しない。
2. ルート`.editorconfig`でUTF-8、LF、final newlineを指定し、エディタ側の保存規約も同じ契約へ揃える。
3. `.prettierrc.json`へ`"endOfLine": "lf"`を追加し、Prettierのwrite／check結果をLFへ固定する。既存のstyle設定や不要な拡張子例外は追加しない。
4. 適用時は既存の変更を保持したうえで`git add --renormalize .`を実行し、EOLだけの差分と意味のある差分を確認する。ブランチ切替後にA→B→Aの`format:check`をWindows Native相当の受入条件とする。

## Consequences

- clean checkoutおよびブランチ切替後のテキストファイルのEOLが、global `core.autocrlf`に依存せずリポジトリ契約へ揃う。
- 既存のCRLF混在を解消するには、適用時のrenormalizeと、差分の意味的な確認が必要になる。
- binary／generated fileの扱いは既存のGit／Prettier ignore契約を維持し、今回のEOL対策で新しい変換スクリプトや依存関係は導入しない。

## Current operational scope (2026-11-25)

- 上記のWindows Native相当の受入条件は、このADR決定時点のEOL移行手順を記録する。現在のAI agentによる通常の`format:check`はLinux／WSL2で実行し、Windows固有の互換性は既存Windows CI契約で確認する。Windows NativeのCodex／OpenCode／PowerShellローカル検証を通常の完了条件には含めない。
- LF属性、EditorConfig、Prettier設定、既存変更を保持した`git add --renormalize .`、および意味差分の確認に関する決定は引き続き有効である。
