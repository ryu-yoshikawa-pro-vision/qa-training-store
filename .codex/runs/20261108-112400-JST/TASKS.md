# Tasks（タスク）

## Now（現在）

- [x] PR #199最新HEADとWeb/Mobile CI、作業2・3の受入条件と既存テストを確認する。
- [x] 通常AIの公開教材・抜粋ファイル読取りを、`O_NOFOLLOW`非対応時に停止させる。
- [x] 読取り直前のsymlink差し替え負例を既存契約テストに追加する。
- [x] 次回の着手先を継続手順に反映し、変更差分とスコープを確認する。

## Discovered（発見事項）

- 作業3のHEAD `6352adae`はWeb CIでSUCCESS。Mobileは本Run開始時点で実行中。
- バックアップの`readUnchangedFile()`は`O_NOFOLLOW`未対応で停止するが、チューターの2か所は`?? 0`で保護を弱めていた。
- 通常AIの実OpenCode 2.0.22認証/外部送信とProviderの保持・料金は今回の証拠に含まれない。

## Blocked（ブロック中）

- 実Providerとの送受信・保持条件には本人の環境/権限/費用確認が必要。実モデル検証は未実施。
