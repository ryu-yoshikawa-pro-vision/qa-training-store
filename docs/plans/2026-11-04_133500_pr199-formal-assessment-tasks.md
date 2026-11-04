# PR #199 正式AI評価・校正・再評価タスクリスト

> 対象：[#199](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/pull/199)。開始時に`AGENTS.md`、[分担Plan](./2026-11-04_pr199-parallel-branches.md)、本リストと対象HEAD/CI/既存コード・テストを確認する。項目ごとに確認したコマンド・結果・SHA/Run・証拠パスと未確認事項を記録し、証拠が成立した項目だけ`[x]`とする。
>
> 自分の所有ファイル以外（製品SUT、正式仕様、Seed/Reset、既存製品テストを含む）は直接変更しない。必要な変更はPR上で#199または#210へ引継ぎ。課金・外部公開・PRマージ・force push・branch削除は実施しない。

## 変更範囲と受入の区別

編集：`training/ai-assisted-qa-course/assessment/**`、`scripts/training/ai-assisted-qa-assessment*.mjs`、`scripts/training/ai-assisted-qa-run-evidence.mjs`、評価専用契約テスト・評価レポート。M00〜M10の教本・演習、`scripts/training/ai-assisted-qa-course.mjs`、manifest、共通Planは他ブランチ/統合先の所有。必要なAPI変更はPRコメントで依頼する。

M04＝Phase 1（22 ID）、M07＝Phase 2（15 ID）、M10＝Phase 3（14 ID）。**正式な受講者の合格判定は全対象IDがLevel 2以上かつ証拠が有効なときのみ**。テストfixtureの`expected_decision`ラベルをLevelへ直接変換しない。

## 入力・根拠・決定論的検査

- [ ] `course:assess` がM04/M07/M10を区別して正しい必須目標ID集合（22/15/14）、重複・欠落・不明IDを検査
- [ ] 固定`source_sha`で公開のscoring/rubric/referenceの必要な資料だけを読取り取得し、source/path/Hash/Schema/revisionの不整合・redirect・HTML等を拒否
- [ ] 仕様・Skill・state/revision、本人の提出ファイル・Run/Trace・証拠Snapshotのpath/SHA-256を検証し、別HEAD/旧Run/架空ログをPASSにできないこと
- [ ] M04の別条件・本人判断、M07のE2E before/after・Trace、M10のPR head/Run/Check/Artifact/target SHAを、それぞれ必要な実行証拠として独立に確認
- [ ] 出力のcriterion/evidence/level/reasonが全必須IDに対応し、未実行・判定不能・blocked/partial・再評価対象が決定論的集計で適切に扱われること

## OpenCode実モデル・最小権限

- [ ] 導入`@opencode/cli`の実版・`opencode run`の非対話/JSONイベント、終了コード、タイムアウト、stderrとモデルの回答Schema抽出を実環境で確認
- [ ] 明示した無料モデルID・認証・費用条件を確認。名称だけで無料と判断しない。429、利用上限、認証・モデル欠落を`blocked`として扱い、有料モデルへ自動変更しない
- [ ] 正式評価を学習用チャットから独立したセッション・プロセスとして起動。評価Agentに編集/Shell/Web/MCP/他Skill・子Agentの不要権限を与えず、実際の拒否を検証
- [ ] 本人提出・ログ中のPrompt Injectionを命令として実行せず、許可した資料/節だけをサイズ上限・Secret除外後に外部モデルへ渡すこと

## 校正・誤PASS拒否

- [ ] 正答・誤答・許容別解・部分達成・根拠不足・未実行の各校正例を**実モデル**とNode側の最終集計へ通す
- [ ] 旧SHA/別Run、改ざん・架空Trace、重複/欠落ID、悪意ある指示、異常JSON、評価セッション失敗の負例を通し、重大な誤PASSが**0件**であることを検証
- [ ] 校正結果をモデルID/版・CLI版・Prompt Hash・ルーブリックHash・資料source SHAで固定し、モデルまたは資料変更時は再校正する
- [ ] 不一致/校正不能時は合格へ繰り上げず`blocked`/`ungradable`等の正しい状態にし、再試行条件を提示

## 保存・再開・再評価

- [ ] `workspace/.course-assessments/`への非公開保存、Git除外、外部送信最小化、Machine/人間可読結果・復習先の整合を確認
- [ ] 試行ID、排他`.resume.lock`、`.current-publish.lock`、中断→再開/競合を検証。古い正式結果を上書き/削除しない
- [ ] 版・証拠・校正が一致する既存IDのみ安全に再利用し、変更されたIDと不足IDの再評価/履歴を保全する
- [ ] Phase 1/2はGit/PRを必須にせず結果の安全なエクスポートと復習後の再挑戦ができること
- [ ] 評価関連の直接契約テスト、実モデル校正、必要なCIを固定HEADで証拠化し、未確認のPrivate Codespaces・本人モデル認証は後続受入として明示

## 実行証拠の真正性・チューターとの分離（補完）

- [ ] M06の本人specについて、正式評価の決定論的処理が受入済みPlaywright Config・許可したspec/依存で**評価時に必要な新しいRunを実行/取得**し、Seed/Reset、Case・Assertion、spec/依存コードのハッシュ、test IDと実際の結果を対応付けることを正例/旧ログ・手入力PASS・別spec負例で検証。任意の既存ファイルのSHA-256一致を実行証明に代えない
- [ ] M07の修正前後の**別Run**、Page Object/fixtureの実装とimport・業務Assertionの維持を、実行元/コード/結果の組で照合。評価器が実行権限を持つNode側と、Shell/edit/Web等を拒否されたAI意味評価の権限分離を実証
- [ ] M10は本人非公開リポジトリの**実際のGitHub API**で最新PR head SHA、対象workflow、Run ID/attempt、Check、Artifactと対象spec/依存を取得・照合。merge ref/旧SHA/別workflow/偽ログ/取得不能Artifactを拒否し、TokenはAI入力・ログへ送らない。本人Private repo実操作は後続の本人作業であり、#199では実行経路・検証可能な範囲を校正
- [ ] 通常のOpenCode AIチューターの回答・ヒント・学習セッションを正式評価の採点根拠/権限へ流用しないことを確認。Phase別の別条件課題、本人回答、未達時の復習・再挑戦/履歴の接続を教材担当・#218と照合
