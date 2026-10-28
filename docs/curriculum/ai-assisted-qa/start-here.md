# AI協働テスト自動化カリキュラム

このカリキュラムは、AIを使ったテスト分析・設計から、PlaywrightでのE2E実装・実行、必要な人向けのGitHub・CI運用までを段階的に学ぶ教材です。教材ページと確認クイズは公開Webで読めます。実技は管理者から案内された個人用学習リポジトリで行います。

## 受講対象と前提

受講前に必要なのは、ブラウザーを開く、文字を入力する、案内された文をコピーして貼り付けるといった一般的なPC操作だけです。QAやソフトウェアテスト、プログラミング、VS Code、ターミナル、Git/GitHub、Codespaces、Playwright、CI、AIエージェントの知識は前提にしません。各章で、その章に必要な言葉、画面、操作、よくある失敗を順に説明します。

教材本文と演習だけで学べます。AIチューターは任意の補助であり、使えなくても受講を続けられます。公開Webで教材を読むこととクイズに答えることはできますが、実技には案内された個人用学習リポジトリとCodespacesへのアクセスが必要です。アクセスがない場合は費用や公開範囲を自己判断せず、実技を未実施として記録してください。

## 教材の読み方

各章は、目的と準備、図、本文の具体例、手順を追う演習、確認と復習、クイズの順に進みます。まず本文の例を読み、同じ手順を試し、その後に条件を変えた課題へ進んでください。クイズで迷ったときは、結果に表示される説明と教材の復習先へ戻ります。用語やエラーが分からない場合も、章を飛ばして推測するのではなく、記載された確認先を使います。

## 受講経路

### Phase 1だけを受講する

M00〜M04を順番に進みます。AIを安全に使い、仕様からテスト条件とケースを作り、テスト候補を判断するフェーズです。Playwright、Git、Pull Request、CIの操作は修了条件に含みません。

### Phase 1とPhase 2を受講する

M00〜M07を順番に進みます。Phase 1のケースをPlaywrightで実装し、Codespaces内で実行・診断するフェーズです。Git、Pull Request、CIの操作は修了条件に含みません。

### 3フェーズすべてを受講する

M00〜M10を順番に進みます。Phase 3は選択制です。Phase 1・2の修了だけで学習を終える場合は、Phase 3のGitHub・CI操作は不要です。

## 共通の始め方

1. 管理者から案内された個人用学習リポジトリと、利用条件を確認します。
2. テンプレートから準備する場合は、案内されたTemplate repositoryで **Use this template → Create a new repository** を選び、個人アカウントのPrivate repositoryを作ります。テンプレート画面から直接「Open in a codespace」を選ぶ未公開Codespaceは、マシン種別を選べません。すでに個人用学習リポジトリを案内されている場合は、この手順を飛ばします。
3. 作成した学習リポジトリを開き、**Code → Codespaces**からCodespaceを作ります。設定を選べる画面では案内されたdev containerと **2-core** を選び、作成前に表示される支払者を確認します。2-coreが選べない、支払者が想定と異なる、利用枠・費用が分からない場合は作成せずBLOCKEDとして管理者へ確認してください。より大きなマシンを代わりに選ばないでください。
4. ブラウザー版VS Codeが開いたら、M00の説明に沿ってエクスプローラー、エディター、ターミナル、Portsを確認します。案内されたCLI、Skill、必要な環境を確認し、APIキーや認証キャッシュを教材・ログ・共有ファイルへ書き込みません。
5. 学習者本人が一度に1つのモジュールだけをロードし、作業結果を確認します。再ロード時に編集済みファイルを上書きしないことを確かめてください。
6. M00から始め、選択する最終フェーズに応じて順に進みます。ロード成功は環境準備の確認であり、技能修了ではありません。

Codespaceのタブを閉じるだけでは実行中のVMは停止しません。終了時は[Codespaces一覧](https://github.com/codespaces)を開き、対象Codespaceのメニューから **Stop codespace** を選びます。停止中は計算資源の利用は止まりますが、保存領域の費用・無料枠条件は別に確認してください。ポートを共有するときは、課題で必要な場合を除きPublicにせずPrivateのままにします。

| ブラウザー版VS Codeの場所 | 役割・最初の確認 |
| --- | --- |
| 左端のActivity Bar / Explorer | ファイル一覧。`workspace/M00/`と提出物の場所を探します |
| 中央のEditor | 開いたファイルを編集します。未保存の印が消えたことを見てから別ファイルへ移ります |
| 下部のTerminal | コマンドとその出力。`pwd`で現在位置を確かめてから相対パスを使います |
| 下部のPorts | 転送されたポートと公開範囲。6080は教材のPrivate/noVNC用途で、Publicへ変更しません |

GitHubの画面名や利用枠は変更されることがあるため、開始時に[リポジトリからCodespaceを作成する手順](https://docs.github.com/en/codespaces/developing-in-a-codespace/creating-a-codespace-for-a-repository)、[マシン種別の変更と確認](https://docs.github.com/en/codespaces/customizing-your-codespace/changing-the-machine-type-for-your-codespace)、[利用枠を確認する手順](https://docs.github.com/en/codespaces/troubleshooting/troubleshooting-included-usage)、[Codespaceの停止](https://docs.github.com/en/codespaces/developing-in-a-codespace/stopping-and-starting-a-codespace)、[転送ポートの公開範囲](https://docs.github.com/en/codespaces/managing-codespaces-for-your-organization/restricting-the-visibility-of-forwarded-ports)を確認してください。

教材やクイズを読むためのGitHubログインは不要です。Codespacesで実技を始める場合はGitHubアカウントが必要です。費用、権限、認証、環境の問題がある場合は、技能の未達と分けてBLOCKEDとして記録します。

## AIチューターを使う

Codespacesで対象モジュールをロードした後、ターミナルから `pnpm course:tutor Mxx --model provider/model-id` を実行します。`Mxx`は学習中のモジュールIDへ置き換え、明示したモデルIDを使います。起動前に送信内容とモデルの利用条件を確認し、表示された確認語を入力してください。チューターはそのモジュールの公開教材と本人の成果物を読み取り専用で参照し、説明・段階的ヒント・誤解の修正を支援します。正式評価記録、別モジュール、Secretは読み取らず、ファイル編集・コマンド実行・正式な修了判定をしません。質問にToken、API key、個人情報を貼らないでください。

## モジュールの進め方

各モジュールでは、説明と根拠のある例を確認し、短い課題を実行してから条件を変えた課題に取り組みます。AIが作った内容は、本人が仕様・ファイル・実行結果で確認します。クイズは一問ずつ回答し、全問回答後に結果、全選択肢の解説、復習先を確認します。クイズの得点は正式な修了判定へ自動転記されません。

## 教材・演習・評価基準を確認する

各モジュールの教材ページ末尾に、演習手順・演習開始入力・提出物テンプレート・Phase別評価基準と確認クイズへのリンクがあります。GitHubの資料は、Web教材の生成元commitと同じ版を開きます。実際の演習・コード実行は個人のCodespaceで行います。

模範解答・採点テスト・完成状態は、受講者に配布するWeb/Templateへ含めません。教材制作担当者はGitHubのPRとリポジトリ上の評価用ファイルを参照し、学習用配布物と区別してください。

[51件の学習項目マップ](../../plans/2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)では、各モジュールで身に付ける能力を確認できます。達成状況は、本文の例、別条件の演習、Phase評価基準にある本人の説明・操作・根拠で確認します。

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

## 学習項目マップ

- [51件の学習項目をモジュール別に見る](../../plans/2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)
