# Phase 1/2 成果物のGit不要バックアップ・復元

このTemplateには、`scripts/training/learner-workspace-backup.mjs`を同梱しています。Codespacesの**ターミナル**から実行します。Git/PRは使いません。本人による実際のダウンロードと復元は、PR #199の最終受入で確認します。

## バックアップ

`pnpm course:load M00`などで課題をロードした後、学習リポジトリのルートから実行します。

```sh
node scripts/training/learner-workspace-backup.mjs export --target /tmp/qa-course-learner-backup.json.gz
```

- 保存先は学習リポジトリ**外**の既存ディレクトリを指定します。既存ファイルへの上書き、Symlink経由の保存は禁止です。
- 出力は**暗号化されていない**単一の`.json.gz`です。SHA-256付きで、テキスト・JSON・TypeScript・画像・PlaywrightのTrace/Runなどのバイナリをそのまま保全します。ファイルモードは本人のみの読み書き（Unixで`0600`）です。
- 対象：`workspace/M00/**`〜`workspace/M07/**`の本人作業ファイル、`workspace/.course-assessments/P1/**`と`P2/**`の非公開評価記録、`.course-load/M00-*.json`〜`M07-*.json`のロード記録。Playwrightの`workspace/Mxx/evidence/runs/**`にあるログ、結果、Traceも含めます。
- 除外：M08〜M10、`output/**`、`.git/**`、`node_modules/**`、`.env*`、認証情報を含む名称・拡張子のファイル。既知Token/秘密鍵のパターンを**含むテキストがある場合はバックアップ全体を停止**し、公開しません。未知の秘密・個人情報の検知を保証しないため、出力の取扱いと共有先は本人が確認してください。
- 資源上限：1ファイル64 MiB、合計256 MiB、1万ファイル。上限超過時は出力を作成しません。データを黙って切り捨てず、必要なら保存方式を再検討します。
- 出力ファイルはCodespacesを削除する前に本人が安全な場所へダウンロードします。**`/tmp`に置いただけでは永続保管になりません**。GitHubへpushしたり、Public TemplateやGitHub Issueへ添付したりしないでください。

## 復元

**同一の`source_sha`と`state_contract_revision`**で生成済みの学習環境に、本人の保存ファイルを置いた後に実行します。

```sh
node scripts/training/learner-workspace-backup.mjs restore --source /tmp/qa-course-learner-backup.json.gz
```

全ファイルのパス、サイズ、SHA-256、配布元commit・revisionを検査します。版違い・改ざん・Symlink・既存ファイルとの内容衝突はBLOCKEDとして停止します。**既存の本人ファイルは上書きしません**。同じ内容のファイルは保持し、欠けているファイルだけ作成します。

I/Oの途中失敗時には、すでに新規作成したファイルが残る場合があります。既存ファイルの書換え・削除は行いません。原因を解消して同じ`restore`を再実行し、内容が一致するファイルを確認してください。

このバックアップのSHA-256は**破損検知**用であり、第三者がファイルとSHA-256を一緒に偽造した場合の真正性までは保証しません。バックアップを配布しないでください。

正式評価単体の`pnpm course:assess M04 --export <assessment-uuid>`などは別機能です。このバックアップは提出物・Run/Trace・非公開評価履歴を含む本人ファイルの保全に使います。
