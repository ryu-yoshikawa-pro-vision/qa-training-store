# GitHub Codespaces利用ガイド

このガイドでは、`qa-training-store`をGitHub Codespacesで開き、Webアプリの開発・テストやAIエージェントの操作を始めるための手順を説明します。

GitHub Codespacesは、ブラウザ上のVS Codeから利用できるクラウド開発環境です。手元のPCにNode.jsなどをインストールすることなく、リポジトリのファイルを編集できます。画面下部の**ターミナル**は、各種コマンドを入力・実行する場所です。初回の環境構築は[`devcontainer.json`](../../.devcontainer/devcontainer.json)の設定に基づいて自動実行されます。

作業を始める前に、まずGitHubへログインし、本リポジトリにアクセスできること、および自分のアカウントでCodespacesを作成できることを確認してください。**Codespacesのコンピューティング・ストレージ利用料金と、OpenCode Zenのモデル利用料金はそれぞれ別体系**となっています。環境を作成する前に[Codespacesの利用料金](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces)を確認してください。

目的に合わせて必要な章だけを進めて構いません。どの作業を行う場合でも、最後は必ず**8. Codespaceを停止・再開・削除する**の手順を確認してください。

- **まずWebアプリを表示する**：2 → 5 → 8
- **Playwrightでテストする**：2 → 5 → 6 → 8
- **OpenCode Zenを使う**：1 → 2 → 3 → 8
- **Codex CLIを使う**：2 → 4 → 8
- **変更をPRにする**：2 → 7 → 8

※Webアプリの確認やPlaywrightテストのみを行う場合、第1章のOpenCode ZenのSecret登録は不要です。

なお、Codespaces環境でサポートしているのは、主にWebおよびTypeScriptの開発です。Android / iOSのネイティブビルドは、従来どおりWindowsやmacOSのローカル環境で行います。

## 1. 利用前にOpenCode ZenのSecretを登録する

**OpenCode Zenを利用する場合は、各自のAPIキーをGitHubアカウントのCodespaces Secretに登録します。** Secretとは、APIキーやパスワードなどをGitHub上に安全に保存し、許可したリポジトリのCodespaceへ環境変数として渡すための機能です。

1. [OpenCode Zen](https://opencode.ai/docs/zen/)にサインインし、APIキーを取得します。利用を開始する前に、[モデル別の料金](https://opencode.ai/docs/zen/#pricing)や残高の自動補充（auto-reload）、月間上限設定を確認してください。**なお、Freeモデルは提供条件が変更される場合があります。**
2. GitHub画面右上のプロフィールアイコンから**Settings → Codespaces**を開きます（[個人のCodespaces設定](https://github.com/settings/codespaces)から直接移動することもできます）。
3. **Codespaces secrets → New secret**を選択します。
4. **Name**に`OPENCODE_API_KEY`と入力し、**Value**に取得したAPIキーを貼り付けます。
5. **Repository access**で`ryu-yoshikawa-pro-vision/qa-training-store`を選択し、**Add secret**をクリックして保存します。不要なリポジトリへのアクセス許可は与えないようにしてください。

**データ保護に関する注意点**：OpenCode Zenの[プライバシーポリシー](https://opencode.ai/docs/zen/#privacy)によると、一部のFreeモデルでは入力データがモデル改善に利用される場合があります。送信先となるモデルと利用規約を事前に確認し、業務上の機密情報や実在する顧客情報、個人情報を許可なく入力しないでください。

これでGitHub側へのSecret登録は完了です。**APIキーの値をリポジトリ内のファイルや`.env`、`devcontainer.json`、Issue、PR、ターミナルの出力などに直接書き込まないでください。** なお、個人のSecretとリポジトリのSettingsにある共通Secretは別物です。今回は個人のSecretを利用します。操作の詳細は[GitHub公式のCodespaces Secret手順](https://docs.github.com/en/codespaces/managing-your-codespaces/managing-your-account-specific-secrets-for-github-codespaces)を参照してください。

すでにCodespaceを起動している場合は、[Your codespaces](https://github.com/codespaces)から該当の環境を一度**Stop codespace**で停止し、再度開き直してください。新しく作成するCodespaceには、作成時に自動でSecretが反映されます。

## 2. Codespaceを作成する

1. [リポジトリ](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store)を開き、緑色の**Code**ボタンから**Codespaces**タブを選びます。
2. **Create codespace on main**をクリックします。別のブランチで作業したい場合は、作成時に対象のブランチを選択してください。
3. ブラウザ版VS Codeが表示されたら、初回のセットアップが完了するまで作成ログを確認します。`postCreateCommand`により、依存ライブラリ、OpenCode、Codex、Playwright用ブラウザのインストールが自動で実行されます。
4. メニューの**Terminal → New Terminal**からターミナルを開き、次のコマンドを入力して動作確認を行います。

```bash
node --version
pnpm --version
gh --version
opencode --version
codex --version
```

それぞれバージョン番号が表示されれば、必要なコマンドが正常に認識されています。エラーなく準備が完了したら、**Webアプリを起動したい場合は第5章**へ、OpenCodeやCodexを使いたい場合はそれぞれ第3章・第4章へ進んでください。

もし`command not found`などのエラーが出た場合は、Codespaceの作成ログ（**View Creation Log**）を開き、インストールの失敗箇所を確認してください。必要な変更を保存済みであれば、コマンドパレットから**Codespaces: Rebuild Container**を実行してコンテナを再構築するのも有効ですが、原因が分からないまま何度も再構築せず、まずはエラー内容を確認してください。また、調査のためにログを他者と共有する際は、APIキーや認証情報が含まれていないことを必ず確認してください。

## 3. OpenCode Zenを利用する

### 3-1. Secretが渡されているか確認する

Codespaceのターミナルで次のコマンドを実行します。**APIキーの値そのものは表示されません。**

```bash
if [ -n "$OPENCODE_API_KEY" ]; then
  echo "OPENCODE_API_KEY: 設定済み"
else
  echo "OPENCODE_API_KEY: 未設定"
fi
```

**設定済み**と表示されたら次へ進みます。**未設定**と表示された場合は、第1章で登録したSecretの名前とRepository accessの設定を確認した上で、Codespaceを一度停止して再起動してください。なお、この確認は環境変数が存在していることのみを示すものであり、APIキー自体の有効性や接続の成功を保証するものではありません。

### 3-2. OpenCodeにSecretを参照させる

OpenCode V2には環境変数を参照するプロバイダー設定があります。設定ファイルには**環境変数名（Secret名）のみ**を記述し、APIキーの値そのものは書き込みません。詳細は[OpenCode V2のプロバイダー設定](https://opencode.ai/v2/docs/providers)を参照してください。

1. ターミナルで`mkdir -p ~/.config/opencode`を実行します。
2. `code ~/.config/opencode/opencode.json`を実行し、VS Codeでファイルを開きます。ファイルがまだ存在しない場合は新しく作成されます。
3. 既存の設定ファイルが**ない場合**は、次の内容を入力して保存します。

```json
{
  "$schema": "https://opencode.ai/config.json",
  "providers": {
    "opencode": {
      "env": ["OPENCODE_API_KEY"]
    }
  }
}
```

既存の設定ファイルが**すでにある場合は、ファイル全体を上書きしないでください**。変更前に`cp ~/.config/opencode/opencode.json ~/.config/opencode/opencode.json.bak`を実行してバックアップを取り、既存の`providers`ブロック内に`opencode`の設定を追加・統合します。JSONの構造や書き方が分からない場合は無理に編集せず、APIキーなどの機密情報を除いた上で周囲に相談してください。なお、この設定ファイルはCodespace内のユーザーホームディレクトリに保存され、リポジトリへコミットされることはありません。

この明示的な設定は、Codespaces Secretの値をOpenCode側で確実に参照させるためのものです。OpenCode V2の標準機能によって環境変数が自動検出される場合もありますが、`/connect`コマンドでキーを直接貼り付けて保存する方式は、本ガイドの標準手順としては採用していません。

### 3-3. 起動・モデル選択・接続確認

ターミナルで次のコマンドを実行します。

```bash
opencode
```

OpenCodeの入力画面で`/models`と入力し、**OpenCode Zenのモデル**を選択します。利用前に[公式の料金一覧](https://opencode.ai/docs/zen/#pricing)を確認し、**Free**と明記されているモデルのみを選択してください。有料モデルは選択しないよう注意してください。

まずは**ファイルを変更しない簡単な質問**を送信し、正常に応答が返るか、エラーが発生しないかを確認します。確認が終わったら、`git status --short`を実行して意図しないファイルの変更が発生していないかもチェックしてください。

**注意：応答が返ってきたこと自体は、APIキーによる認証が通った証明にはなりません。** Freeモデルはキーがなくても応答できる場合があるほか、以前に保存された認証情報が環境変数よりも優先されるケースがあるためです。個人のSecretを経由して正しく動作しているかを厳密に検証したい場合は、保存済み認証情報のない**新規のCodespace**を作成し、Secretの存在と設定の反映を確認した上で、OpenCode Zen側の利用履歴と照合してください。履歴からキーの利用が特定できない場合は、記録上**認証経路は未確認**として扱ってください。なお、APIキーそのものや認証データベースの内容を画面に表示したり共有したりしないでください。

`providers.opencode.env`の設定形式は公式仕様に沿ったものですが、**本リポジトリで固定されているCLIと個人のCodespaces Secretを組み合わせた実機での認証動作は未検証です**。そのため、動作確認が完了するまでは「Secretによる認証が確実に成功した」と保証する手順ではありません。エラーが発生した場合は、SecretのRepository access設定、Codespaceの停止と再開、環境変数が設定されているか、設定ファイルの内容、選択したモデル、出力されたエラーメッセージを順に確認してください。また、**Secretを登録したからといって、無条件で無料利用が保証されるわけではない点にも注意してください。**

なお、PR #188の時点でOpenCode CLI自体の動作は確認できていますが、VS CodeのOpenCode拡張機能は起動時のオプション不一致により正常に動作しません。そのため、**OpenCodeは必ずターミナルから起動してください。**

## 4. Codex CLIを利用する

Codespacesはリモート環境であるため、Codex CLIの認証にはデバイスコード（device-code）認証を使用します。

1. [ChatGPT](https://chatgpt.com/)にログインし、**Settings → Security（またはSecurity and login）**を開いて、Codexの**device-code sign-in / authorization**を有効にします。画面の項目名は変更されることがあります。なお、組織のChatGPTワークスペースを利用している場合は、管理者による許可が必要です。
2. Codespaceのターミナルで次のコマンドを実行します。

```bash
codex login --device-auth
```

ターミナルに表示されたURLを**ローカルPCのブラウザで開き**、同じChatGPTアカウントでログインして一時コードを入力します。このコードは第三者に共有しないでください。

認証が完了したらターミナルに戻り、認証状態を確認してからCodexを起動します。

```bash
codex login status
codex
```

ログインできない場合は、ChatGPT側のdevice-code設定とログイン中のアカウントを確認し、新しく発行されたコードを使って再度実行してください。あわせて[Codex公式の認証手順](https://developers.openai.com/codex/auth)も参照してください。検証用や共有用のCodespaceでの作業を終える際は、`codex logout`を実行してログアウトしてください。APIキーやローカルの認証キャッシュを外部にコピーして使い回すような運用は行わないでください。

VS CodeのCodex拡張機能`OpenAI.chatgpt`もインストールされますが、PR #188の時点では拡張機能経由の全操作は検証されていません。確実な操作手段としてCLIを利用してください。

## 5. Webアプリを起動する

ターミナルで次のコマンドを実行します。

```bash
pnpm run start:web
```

**このコマンドを実行するとWebサーバーが常駐して起動し続けるため、ターミナルが入力待ちに戻らなくても問題ありません（正常な挙動です）。** VS Code下部のパネル領域で**Ports**タブを開き、`qa-training-store (8081)`の行にある地球儀アイコン（または右クリックメニュー）から**ブラウザで開く**を選択してください。Storefrontの画面に「決定的なシナリオで、確かなテストを。」という見出しが表示されれば、PR #188と同様に正常な起動が確認できたことになります。

もし8081番ポートが表示されない場合は、`pnpm run start:web`を実行したターミナルにエラーログが出ていないか、サーバーが8081番で起動しているかをまず確認してください。なお、ポートの可視性（公開範囲）は**Private**のまま運用し、**Publicには変更しないでください**。サーバーを終了する際は、起動中のターミナルで`Ctrl+C`を押します。

## 6. Playwrightでテストと録画を行う

**既存のE2Eテスト**を実行する場合は、設定によるサーバーの二重起動や競合を防ぐため、原則として第5章の開発サーバーをいったん`Ctrl+C`で停止してから次のコマンドを実行します。Playwrightは設定ファイルに従って自動でテスト用Webサーバーを立ち上げます。もし8081番のサーバーがすでに起動している場合、ローカル環境ではその既存サーバーを再利用する設定になっているため、意図しない状態の開発サーバーに対してテストを実行してしまわないよう注意してください。

```bash
pnpm run test:e2e:chromium
```

コマンドが正常終了し、失敗したテストが0件であればテスト成功です。失敗したテストがある場合は、最後に表示される失敗件数とエラーログを確認してください。なお、コード検証用のコマンドである`pnpm run verify`はフォーマット、リント、型チェック、単体テスト、ビルドなどを一括で検証しますが、**PlaywrightによるE2Eテストは含まれていません**。E2Eテストの成否と`verify`の成否は、それぞれ個別に判断してください。

**録画（codegen）の練習**を行う場合は、ターミナルを2つ開き、一方のターミナルでWebアプリを起動した状態を維持しながら、もう一方のターミナルで録画コマンドを実行します。

**ターミナル1：**

```bash
pnpm run start:web
```

**ターミナル2：**

```bash
pnpm exec playwright codegen http://127.0.0.1:8081
```

**Ports**タブから**Playwright Desktop (6080)**を開くと、Codespace内部で動作しているChromiumブラウザとPlaywright Inspector（操作の記録・確認用ウィンドウ）が表示されます。このGUI画面の表示には、noVNCというリモート画面転送機能が利用されています。

ポート`6080`は**Private**のまま運用し、`5901`は公開しないでください。

### 録画結果をテストとして実行する

1. noVNC画面上の**Chromium**で、Storefront画面のリンクなどをクリックしてみます。**Playwright Inspector**に`page.goto`や`click`といった操作コードが逐次追加されることを確認してください。なお、これは操作画面の動画を録画する機能ではなく、**自動テストとして再実行可能なコードを生成する機能**です。
2. Inspector画面で録画を停止し、**Copy**ボタンをクリックして生成されたコード全体（`import`文や`test(...)`ブロックを含む）をコピーします。
3. VS Codeのエクスプローラーで`e2e/web/practice-phase1-required.spec.ts`という**練習用の新規ファイル**を作成し、コピーしたコードを貼り付けて保存します。**既存のテストファイルを上書きしないよう十分注意してください。**
4. 別のターミナルを開き、以下のコマンドを実行します（このとき、録画用に立ち上げたWebサーバーは起動したままで問題ありません）。

```bash
pnpm exec playwright test e2e/web/practice-phase1-required.spec.ts --project=chromium
```

テスト結果に`passed`が表示され、失敗がなければ再実行は成功です。もしテストが失敗した場合は、録画時に行った操作手順や前提となる画面状態が再現できているかを確認してください。

なお、本リポジトリの`chromium`プロジェクトには`testMatch`によるテストファイル名のフィルタが設定されており、通常の`pnpm run test:e2e:chromium`コマンドでは既存の指定された3ファイルのみが明示的に実行されるようになっています。そのため、練習用に作成した`practice-phase1-required.spec.ts`を動かす際は、**上記のようにファイルを指定した個別コマンド**で実行してください。たとえばファイル名を`recorded.spec.ts`などの任意の名称にした場合、実行対象外となってしまうため注意が必要です。

練習が終わった後、作成した練習用ファイルをリポジトリの正式な変更に含めない場合は、`git status --short`で状態を確認した上で、`rm e2e/web/practice-phase1-required.spec.ts`を実行して削除してください。もし録画・生成したコードを正式なテスト資産として追加・コミットしたい場合は、プロジェクト既存のテスト設計や命名規則、検証方針に照らし合わせて別途適切に判断してください。

PR #188ではGUI（noVNC）およびCLI経由での`codegen`の動作を確認済みですが、VS CodeのPlaywright拡張機能にある`Testing`サイドバーや`Record new`、`Record at cursor`といった個別機能の動作は未検証です。

## 7. 変更を保存してPull Requestを作成する

Gitの基本用語の定義は以下のとおりです。**ブランチ（branch）**は作業や変更履歴を分岐させる作業場所、**コミット（commit）**は変更内容の記録、**プッシュ（push）**はローカルで記録したコミットをGitHubへ送信すること、**プルリクエスト（Pull Request / PR）**は変更内容を本体に取り込んでもらうためのレビュー申請です。

以下の手順は、**実際に変更を提出する権限や作業タスクがある場合の操作例**です。単なる練習目的のためだけにREADMEを無意味に変更してPRを作成することは避けてください。本リポジトリへ直接ブランチをプッシュするには、リポジトリへの書き込み権限（Push権限）が必要です。権限をお持ちでない場合は管理者に相談するか、必要に応じて[GitHubのFork方式](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/about-forks)を利用してください。

まずターミナルで現在の作業ツリーの状態を確認し、作業用のブランチを作成・切り替えます。以下の`docs/example-change`はブランチ名の例ですので、実際の作業内容に応じた適切な名前に変更してください。

```bash
git status --short
git branch --show-current
git switch -c docs/example-change
```

例えば`README.md`を編集した場合は、保存後に次のコマンドを実行します。

```bash
git diff --check
git status --short
git add README.md
git commit -m "docs: READMEの説明を更新"
git push -u origin docs/example-change
```

`git add README.md`はREADMEのみをステージングする例です。他のファイルを編集した場合は、そのファイルパスに置き換えて実行してください。もし`nothing to commit`と表示された場合は、エディタ上でファイルの変更が正しく保存されているかを`git status --short`で確認してください。

プッシュが完了したらGitHub上でリポジトリのページを開き、表示される**Compare & pull request**ボタン（表示されない場合は**Pull requests**タブから**New pull request**）をクリックします。マージ先である**baseがmain**、取り込む変更である**compareが自分の作業ブランチ**になっていることを確認し、PRのタイトルと変更内容、検証結果を明記して**Create pull request**をクリックします。作成したPRのページが表示されれば申請完了です。その後は[CONTRIBUTING.md](../../CONTRIBUTING.md)および[AGENTS.md](../../AGENTS.md)のガイドラインに従い、必要な自動テストやCIが正常に通っているかを確認してください。

## 8. Codespaceを停止・再開・削除する

1. [Your codespaces](https://github.com/codespaces)を開きます。
2. 一覧から該当するCodespaceの`…`（三点リーダー）メニューを開き、**Stop codespace**を選択して環境を停止します。作業を再開する際は、一覧に表示されているCodespaceの名前をクリックすれば再び開きます。
3. 作業が完了して不要になったCodespaceは、未コミットや未プッシュの変更が残っていないことを確認した上で、同じメニューから削除（Delete）を実行します。

**ブラウザのタブを閉じただけではCodespaceは停止しません。** また、コンテナを停止している間でもストレージ（保存領域）の利用料金が発生する場合があります。作業を終了するときは忘れずに明示的な停止操作を行い、利用料金や無料枠、稼働時間の詳細については[GitHub公式のCodespaceライフサイクル解説](https://docs.github.com/en/codespaces/about-codespaces/understanding-the-codespace-lifecycle)を参照してください。

`devcontainer.json`の設定内容が変更された場合は、必要に応じてCodespaceを再構築（Rebuild）してください。再構築を実行する前には、作業中の変更内容を必ずコミットおよびプッシュしておいてください。

## 9. 既知の制約と導入記録

- PR #188にてOpenCode CLIの正常動作は確認済みです。ただし、VS Code拡張機能`sst-dev.opencode`については、拡張機能の起動時に付与される引数`opencode --port 65147`を固定バージョンのCLIが受け付けず、起動できない問題が確認されています。本問題が解決するまでは、ターミナルからCLIを直接利用してください。
- Android / iOSのネイティブビルドはCodespaces環境のサポート対象外です。
- [Codespaces環境導入Plan](../plans/2026-10-02_173400_codespaces-opencode-devcontainer.md)および[IDE・Playwright導入Plan](../plans/2026-10-04_160000_codespaces-ide-playwright-recording.md)は、PR #188実装当時の設計・検証記録です。当時の検証における「FreeモデルをAPIキーなしで動作確認した記録」と、本番運用・通常利用における「個人のSecretを設定して利用する」運用方針とは前提が異なる点にご留意ください。
