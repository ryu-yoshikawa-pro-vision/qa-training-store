# AI協働テスト自動化カリキュラム

このカリキュラムは、AIを使ったテスト分析・設計から、PlaywrightでのE2E実装・実行、必要な人向けのGitHub・CI運用までを段階的に学ぶ教材です。教材ページと確認クイズは公開Webで読めます。実技は管理者から案内された個人用学習リポジトリで行います。

## 受講経路

### Phase 1だけを受講する

M00〜M04を順番に進みます。AIを安全に使い、仕様からテスト条件とケースを作り、テスト候補を判断するフェーズです。Playwright、Git、Pull Request、CIの操作は修了条件に含みません。

### Phase 1とPhase 2を受講する

M00〜M07を順番に進みます。Phase 1のケースをPlaywrightで実装し、Codespaces内で実行・診断するフェーズです。Git、Pull Request、CIの操作は修了条件に含みません。

### 3フェーズすべてを受講する

M00〜M10を順番に進みます。Phase 3は選択制です。Phase 1・2の修了だけで学習を終える場合は、Phase 3のGitHub・CI操作は不要です。

## 共通の始め方

1. 管理者から案内された個人用学習リポジトリと、利用条件を確認します。
2. 自分の利用枠で2コアのCodespaceを作成できることを確認します。利用枠や費用が確認できないときは開始せず、管理者へ確認してください。
3. Codespaces内で案内されたCLI、Skill、必要な環境を確認します。APIキーや認証キャッシュを教材・ログ・共有ファイルへ書き込みません。
4. 学習者本人が一度に1つのモジュールだけをロードし、作業結果を確認します。再ロード時に編集済みファイルを上書きしないことを確かめてください。
5. M00から始め、選択する最終フェーズに応じて順に進みます。ロード成功は環境準備の確認であり、技能修了ではありません。

教材やクイズを読むためのGitHubログインは不要です。Codespacesで実技を始める場合はGitHubアカウントが必要です。費用、権限、認証、環境の問題がある場合は、技能の未達と分けてBLOCKEDとして記録します。

## AIチューターを使う

Codespacesで対象モジュールをロードした後、ターミナルから `pnpm course:tutor Mxx --model provider/model-id` を実行します。`Mxx`は学習中のモジュールIDへ置き換え、明示したモデルIDを使います。起動前に送信内容とモデルの利用条件を確認し、表示された確認語を入力してください。チューターはそのモジュールの公開教材と本人の成果物を読み取り専用で参照し、説明・段階的ヒント・誤解の修正を支援します。正式評価記録、別モジュール、Secretは読み取らず、ファイル編集・コマンド実行・正式な修了判定をしません。質問にToken、API key、個人情報を貼らないでください。

## モジュールの進め方

各モジュールでは、説明と根拠のある例を確認し、短い課題を実行してから条件を変えた課題に取り組みます。AIが作った内容は、本人が仕様・ファイル・実行結果で確認します。クイズは一問ずつ回答し、全問回答後に結果、全選択肢の解説、復習先を確認します。クイズの得点は正式な修了判定へ自動転記されません。

## 教材・演習・評価基準を確認する

各モジュールの教材ページ末尾に、演習手順・演習開始入力・提出物テンプレート・Phase別評価基準と確認クイズへのリンクがあります。GitHubの資料は、Web教材の生成元commitと同じ版を開きます。実際の演習・コード実行は個人のCodespaceで行います。

模範解答・採点テスト・完成状態は、受講者に配布するWeb/Templateへ含めません。教材制作担当者はGitHubのPRとリポジトリ上の評価用ファイルを参照し、学習用配布物と区別してください。

## フェーズと教材

### Phase 1：AIエージェントとテスト分析・設計

1. [M00：学習環境とAIの安全な利用](./modules/M00/README.md)
2. [M01：QAと自動化の基礎](./modules/M01/README.md)
3. [M02：仕様とリスク分析](./modules/M02/README.md)
4. [M03：テスト設計](./modules/M03/README.md)
5. [M04：設計レビューと自動化対象選定](./modules/M04/README.md)

### Phase 2：Playwright構築・実装・実行・改善

1. [M05：Node.js・TypeScript・Playwrightの最小基礎](./modules/M05/README.md)
2. [M06：E2E実装と実行](./modules/M06/README.md)
3. [M07：失敗分析と保守](./modules/M07/README.md)

### Phase 3：GitHub・CIによる継続実行（選択）

1. [M08：Git・GitHubとレビュー](./modules/M08/README.md)
2. [M09：CIと品質ゲート](./modules/M09/README.md)
3. [M10：Phase 3総合演習](./modules/M10/README.md)

## 次に読むもの

- [M00：学習環境とAIの安全な利用](./modules/M00/README.md)
- [M01：QAと自動化の基礎](./modules/M01/README.md)
- [M02：仕様とリスク分析](./modules/M02/README.md)
- [M03：テスト設計](./modules/M03/README.md)
- [M04：設計レビューと自動化対象選定](./modules/M04/README.md)
- [M05：Node.js・TypeScript・Playwrightの最小基礎](./modules/M05/README.md)
- [M06：E2E実装と実行](./modules/M06/README.md)
- [M07：失敗分析と保守](./modules/M07/README.md)
- [M08：Git・GitHubとレビュー](./modules/M08/README.md)
- [M09：CIと品質ゲート](./modules/M09/README.md)
- [M10：Phase 3総合演習](./modules/M10/README.md)
- [Scenario ShopのCart正式仕様](../../spec/features/cart.md)
- [学習項目と到達基準](../../plans/2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)

\n
