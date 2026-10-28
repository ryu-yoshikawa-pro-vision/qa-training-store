# AI協働QAカリキュラム：未経験者向け教本の実装計画

## 0. 依頼概要

- 依頼内容: PR #199のM00〜M10を、QA・プログラミング・開発ツール未経験者が独学できる図解付き教本へ改善する。
- 背景: 現行PlanにはQA経験を前提とする記載があり、学習画面・教材リンク・技術情報の表示にも監査で未達が見つかった。
- 期待成果: 51学習目標と3フェーズの評価契約を維持し、概念説明、例、再現可能な手順、失敗時の確認、段階的演習、別条件への転移を教材・演習・クイズ・Webでつなぐ。

## 1. ゴール / 完了条件

- ゴール: `docs/plans/2026-10-25_202700_ai-assisted-qa-curriculum-learning-experience-rework.md`とM00〜M10を、今回指定された受講者像と教本要件に整合させる。
- 完了条件（DoD）:
  - 51個の既存objective ID、M00〜M10、3フェーズ、Phase末の正式評価契約に追加・削除・意味変更がない。
  - 51目標それぞれについて、既存の監査表を更新し、教材箇所、前提、説明、具体例、図、操作、失敗説明、段階練習、別条件評価、復習先を根拠付きで記録する。
  - 各モジュールの本文・演習・クイズ・公開rubricが同じ学習順序と完了条件を示す。非公開模範解答、採点JSON、completed state、Secretは受講者向け成果物へ含めない。
  - 必要な概念図を再検証可能なSVGで作り、教材本文に読み方と結論を記載する。利用可能な画像生成手段で適した学習イラストを作る。実操作画面は実環境から取得できたものだけを使用し、取得不能はBLOCKEDとして記録する。
  - 教材、演習、公開rubric、開始入力、復習先へ同じサイト内から移動できる。
  - 本文とクイズが共通レイアウト、ナビゲーション、現在地表示を使い、SHA-256を画面に表示しない。内部revision検証・回答の保存/再開は保つ。
  - 全11教材・全11クイズをdesktop/mobileで確認する。M00/M01/M03/M05は追加で画面・意味内容を詳しく確認する。
  - 必要なvalidator、contracts、build、Web E2E、a11y、`pnpm run verify`、最新headのWeb CI/Mobile App CIを実行し、実行者・head・結果を区別して記録する。
  - 既存PR #199を通常更新する。merge、close、branch削除、force pushは行わない。既存の未追跡`workspace/`成果物を変更・stageしない。

## 2. 現状理解と前提

- 現状理解: PR #199はOPEN、branchは`docs/plan-ai-agent-qa-curriculum-redesign`、開始HEADは`70ffd6c4c1fe84cc0e9802fb186f125e087dfa36`。ローカル・upstream・PR headは開始時点で一致している。既存のRunには旧タスク履歴とTask 6/7の未実施記録がある。
- 前提: 添付の今回指示を現行Planの旧受講前提より優先する。一般的なPC操作以外にQA、コード、VS Code、terminal、Git/GitHub、Codespaces、Playwright、CI、AI agent/Skillsの知識を要求しない。
- 前提: 既存Markdown・静的Web builder・知識グラフ・assessment contractを再利用する。既存のobjective ID、Phase契約、固定Skill revision、採点資料の公開境界を維持する。
- 対象外: 実Template/2-core Codespace技術受入とOpenCode実モデル校正（Run Task 6/7）。ユーザー指定どおり別の未完了事項として記録し、本教材改善の受入根拠に混ぜない。新CMS/LMS、未承認の課金、外部送信、実際のSecretsの使用。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。対象・受講者像・維持条件・配布境界・検証・GitHub lifecycleは今回の指示で確定している。
- 仮定してよい細部: 正確性が必要な技術図はSVG、概念をつかむ補助イラストはbuilt-in image generationを使う。本文は日本語、既存のMarkdownを正本、既存静的buildを配信経路とする。
- 未回答の重要質問: 実GitHub/Codespaces/VS Code/Actions画面への認証や対象環境が利用できなければ、その画面を架空で補わず未取得として記録する。

## 4. 影響範囲

- 影響範囲: 最新改善Plan、受講開始、11教材、11クイズ、公開演習資料・rubric、共有Web renderer/CSS/nav、配布リンク生成、curriculum contracts/validators、Web E2E/a11y、objective audit、Run/PR記録。
- 確認対象ファイル: `docs/curriculum/ai-assisted-qa/**`; `training/ai-assisted-qa-course/exercises/**`; `training/ai-assisted-qa-course/inputs/**`; 公開`phase-*-rubric.md`; `docs/plans/2026-10-25_202700_ai-assisted-qa-curriculum-learning-experience-rework.md`; `docs/plans/2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md`; `docs/reports/2026-10-27_ai-assisted-qa-objective-audit.md`; `scripts/docs/build-ai-assisted-qa.ts`; `scripts/spec/markdown.ts`; 関連contractsと`e2e/web/ai-assisted-qa-course.spec.ts`。

## 5. 変更方針

- 変更方針:
  1. objective map、現行本文、演習、公開rubric、quiz、開始/終了状態、知識グラフを再利用し、51目標の現状と修正範囲を対応付ける。
  2. 最新改善Planとstart-hereの受講者前提、前後章・準備・復習・完了導線を更新する。
  3. 静的rendererに共通の教材/クイズshellを設け、目次、現在地、前後章/クイズ、本文・クイズ間、内部教材リンクを同じ構造にする。受講者向けに公開可能な資料だけを明示allowlistで配布する。
  4. 各章の冒頭、用語説明、worked example、予測/模倣/部分補完/別条件の自力演習、エラー回復、章末復習をobjectiveの到達水準に合わせて追加する。
  5. 読みにくい関係を正確なSVG図へし、図の読み方を本文でも説明する。実画面は出典と取得状態を記録し、秘匿情報を含めない。
  6. quiz distractor explanation、復習リンク、演習提出物、公開rubricが実際の本文の教えた内容を評価するよう更新する。正式評価の契約・ID・Phase基準は維持する。
  7. 51目標対応表を具体的な教材箇所・例・演習・正答根拠とともに更新し、構造検査、実画面検査、semantic reviewを別の根拠として記録する。
  8. 既存の品質ゲートとブラウザー検証後、差分を限定してPR #199へcommit/push/本文更新し、exact-head CIを待つ。
- 実行タスク:
  - [x] 1. 教材/評価/配布境界のobjective別mappingを維持し、51目標の監査根拠と未経験者向け受講者像をPlanへ反映する。
  - [x] 2. M00〜M10教材の章導入・説明・図解・段階練習・復習/評価接続を更新する。
  - [ ] 3. 概念図/学習イラストを作成した。GitHub/Codespaces/VS Code/Actionsの実操作画面は取得できておらず、未取得としてBLOCKED記録する。
  - [x] 4. 既存の公開演習資料・公開rubric・quiz・Phase評価契約との対応を51目標監査とContractで照合する。
  - [x] 5. 共通web shell/nav/link/asset配信を整え、画面表示からSHA-256等を除き、本文末尾のliteral `\n`を除く。
  - [x] 6. objective semantics、公開境界、link/asset、responsive UI、quiz stateを検知するContract/E2Eを補う。Contract 60/60 PASS。拡張E2Eの実行結果は後段にBLOCKEDで記録する。
  - [ ] 7. M00/M05の実画面16枚を取得・確認した。M01/M03の詳細画面と拡張後の全11教材・全11クイズdesktop/mobile再確認は未完了。
  - [ ] 8. 必要なvalidator/build/targeted E2Eは一部PASS。拡張後E2Eとaggregate `pnpm run verify`は実行環境制約があり、完了条件を満たさない。
  - [ ] 9. objective audit補足、Run、PR本文、commit/push、PR head同期、exact-head CI確認が未完了。

## 6. 検証方法

- 検証計画: `validate:curriculum`、`validate:ai-assisted-qa`、`test:contracts`、`build:web`、`build:spec`、関連Web E2E/a11y、`pnpm run verify`を確認する。画像・Markdownリンク・alt/allowlist・非公開資料非同梱のvalidatorを追加する。実ブラウザーで全教材/quiz routeをdesktop/mobileに表示し、M00/M01/M03/M05の代表画面と図/code/操作を詳細確認する。51行のobjective auditで本文箇所、演習、評価根拠を照合する。
- 成功判定: exit codeと結果の要約だけではなく、具体的な教材箇所・描画された図/画面・受講者が実行できる操作・異条件演習・復習経路の確認を併記する。CIは新commitのPR head SHAに対するWeb CI/Mobile App CIだけを採用する。未取得の実画面、Runtime/モデル受入、受講者pilotはPASSにせず未確認/BLOCKEDとする。

## 7. リスクと未解決論点

- リスク: 文章を増やしても概念説明と別条件への転移が不十分なままになりうる。図が本文と食い違う可能性。公開演習と非公開採点資料の境界を誤る可能性。既存quiz保存形式/内部revision/assessment IDsを壊す可能性。未追跡workspace成果物を誤って含める可能性。環境制約によりRun、Git、画像、実UI、CIの一部がBLOCKEDとなる可能性。
- 未解決の質問: 実画面やプレビューが認証・外部実環境を要求するときは取得範囲を記録し、利用できないものは代替画面を捏造しない。

## 8. 成果物

- 変更済み（未commit）: M00〜M10 README、`start-here.md`、画像assets、共通Web builder/Markdown CSS、ContractとWeb E2E、未経験者向け改善Plan。
- 変更済み（未commit）: 既存objective auditへ本補足を追記。51目標の既存行は保持する。
- 未更新: active Runの`TASKS.md`/`REPORT.md`、PR本文。Runの`run.json`は編集しない。
- 証跡: ローカル生成物`output/playwright/ai-assisted-qa/`の16画面はM00/M05の表示確認用。M01/M03の詳細画面および外部ツールの実操作画面は未取得。

## 9. 備考

- PR #199以外のbranch/PRを触らない。Git statusで確認した`workspace/M05/validation/`、`workspace/M06/acceptance-probe.spec.ts`、`workspace/M08/`、`workspace/M10/`は無変更・非stageで保持する。
- Run artifact保存先`.codex/runs/`は開始時環境でread-onlyと観測された。記録の必要部分は実装を継続してから承認付きの限定書き込み可否を確認し、書けない場合はRunをPASS扱いにせず最終報告にBLOCKEDとして残す。
- Task 6/7は今回の教材変更とは分離し、未完了を維持する。

## 10. 2026-10-28 実施状況

- Progress: 55% (5/9)。完了はobjective/Plan対応、11教材改稿、既存演習・評価契約照合、Web共通導線、構造/公開境界Contract強化。実画面取得、拡張画面レビュー、aggregate verify、Run/PR/GitHub同期は残る。
- 23件の検証可能なSVGと3件の学習イラストPNGを追加し、11章すべてに本文内の図・代替テキスト・説明を置いた。実GitHub/Codespaces/VS Code/Actions操作画面は作成画像で代替せず、未取得とする。
- 現行HEAD `70ffd6c4c1fe84cc0e9802fb186f125e087dfa36` に対するPR/CI成功記録は、今回のworking-tree差分を検証しない。新しいPR headでのCI確認は未実施。
- Next: 画面接続可能なE2E環境を確立してM01/M03を含む拡張実画面レビューを完了し、aggregate verifyとRun/PR同期を再開する。
