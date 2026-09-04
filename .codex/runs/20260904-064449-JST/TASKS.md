# Tasks

## Now

- [x] 1. Run／Charter／BEFORE snapshotとbranch・PR・environment・Codex diagnosticsを固定する。
- [x] 2. project／user／managed／plugin／executor-scopedのHook sourceと直前session／repositoryログをredactedに相関付け、failed Hook候補を絞る。
- [x] 3. 全6 eventのA（script単体）と正常／異常入力のexit semanticsを確認する。
- [x] 4. failed候補のB（configured command）を同一PowerShell／cmd／root・nested cwdで再現し、最初のexit 1 boundaryを特定する。
- [x] 5. 可能な範囲でC（実Codex runtime）を最小probeし、Hook status／spawn／stdout／stderr／exit／side effectを相関する。
- [x] 6. 現存EvidenceでPrimary／Secondary CauseとPR #106との因果関係を評価し、歴史的event identityはKnown Limitationとして分類して修正要否を判断する。
- [x] 7. repository原因の場合のみ回帰test・最小修正・関連validation・runtime再確認を行い、外部原因なら変更なしを検証する。
- [x] 8. Run Artifactをsanitizer／after snapshot／contractで確定し、PR #106の状態とworking treeを最終報告する。

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- D1. （必要になったら追記）
- D2. 直前TUIに対応する`codex.exe`プロセスは20:02–20:05 JST起動で、PR #106のconfig変更（22:16以降）より前のsnapshotを保持していた可能性がある。再起動前後比較が必要。
- D3. 保存されたrollout／thread historyにはHook itemがなく、報告されたUI文言だけを過去のeventへ一意に逆引きできない。Codex upstreamの診断不足issueと整合する。

## Blocked

- B1. （ブロック時のみ記載）
