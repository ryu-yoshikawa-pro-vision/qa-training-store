# M00 実技：安全なファイル操作と依頼

## 入力と作業範囲

開始入力 `inputs/M00/start.md` と受講開始ガイドを読みます。編集できる場所は `workspace/M00/` だけです。削除、外部通信、Secretの閲覧、課金操作は行いません。

## 手順

1. 受講開始ガイドを使って個人用repository、支払者、2-core、案内されたdev containerを確認します。2-coreが選べない、支払者が違う、利用枠が不明ならCodespaceを作らずBLOCKEDと記録します。
2. VS CodeのExplorer・Editor・Terminal・Portsを示し、`pwd`の出力を見てから `pnpm course:load M00` を実行します。`workspace/M00/submission.md`が作られたことを確認します。
3. `practice.md`と`notes.md`を新規作成し、一文を書いて保存します。各ファイルを開き直して内容を確認します。
4. 手本の読取り専用依頼をエージェントへ渡し、応答と提出ファイルが一致するか、余計な変更がないか確認します。
5. `.agents/skills/qa-workflow/SKILL.md`と参照先を読み、入力・実行範囲・helper・停止条件を確認します。その後、READMEにある制約付き読取り専用依頼を実際に実行し、Skill名・配布revision・秘匿情報を除いた応答・変更有無を記録します。Skillが使えない場合や範囲外の操作を提案する場合は停止し、未実行/BLOCKEDとして扱います。
6. 条件を変えた自分の依頼を作り、目的、参照資料、許可範囲、成果物、確認方法を含めます。
7. `pnpm course:load M00`を再実行して、作成した練習ファイルが保全されたことを開き直して確認します。予想外の上書きや競合があれば、強制せず停止します。
8. Secretや範囲外ファイルを扱う提案を拒否し、その理由と安全な代替を記録します。6080をPrivateのまま確認し、CodespaceのStop codespace操作と費用・利用枠の確認先を示します。

## 提出物

`workspace/M00/submission.md`にCodespaceの2-coreと支払者確認、現在位置、Skillの配布revision・制約付き依頼・応答、変更有無、採否、再ロード前後のファイル確認、分からなかった操作を記録します。APIキー、個人情報、会話全体は保存しません。Skillを起動できない場合は未実行/BLOCKEDの理由を残し、成功したことにしません。
