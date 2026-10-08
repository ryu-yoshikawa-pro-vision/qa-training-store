# GitHub Codespaces利用ガイド

このガイドは、`qa-training-store`をGitHub Codespacesで開き、Webアプリの開発・テストやAIエージェントの操作を始めるための手順です。

GitHub Codespacesは、ブラウザ上のVS Codeから利用できる開発環境です。自分のPCにNode.jsなどをインストールせずに、リポジトリのファイルを編集できます。画面下部の**ターミナル**は、コマンドを入力する場所です。初回の環境準備は[`devcontainer.json`](../../.devcontainer/devcontainer.json)に従って自動実行されます。

最初に、GitHubへログインし、このリポジトリを開けることと、自分のアカウントでCodespacesを作成できることを確認してください。**Codespacesのコンピューティング・保存領域の料金と、OpenCode Zenのモデル利用料金は別**です。作成前に[Codespacesの利用料金](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces)を確認してください。

目的に合う章だけ進めて構いません。いずれも最後は**8. Codespaceを停止・再開・削除する**を確認します。

- **まずWebアプリを表示する**：2 → 5 → 8
- **Playwrightでテストする**：2 → 5 → 6 → 8
- **OpenCode Zenを使う**：1 → 2 → 3 → 8
- **Codex CLIを使う**：2 → 4 → 8
- **変更をPRにする**：2 → 7 → 8

OpenCode ZenのSecret登録は、WebアプリやPlaywrightだけを使う場合には不要です。

Codespacesで対応するのは主にWeb / TypeScript開発です。Android / iOSのNative Buildは、従来どおりWindows / macOSのローカル環境で行います。

## 1. 利用前にOpenCode ZenのSecretを登録する

**OpenCode Zenを利用する人は、自分のAPIキーをGitHubアカウントのCodespaces Secretに登録します。** SecretはパスワードなどをGitHubに安全に保存し、許可したリポジトリのCodespaceへ環境変数として渡す機能です。

1. [OpenCode Zen](https://opencode.ai/docs/zen/)にサインインし、自分のAPIキーを取得します。利用前に[モデル別の料金](https://opencode.ai/docs/zen/#pricing)と、残高の自動補充（auto-reload）・月間上限を確認してください。**Freeモデルは提供条件が変わることがあります。**
2. GitHub右上のプロフィール画像から**Settings → Codespaces**を開きます。[個人のCodespaces設定](https://github.com/settings/codespaces)からも移動できます。
3. **Codespaces secrets → New secret**を選択します。
4. **Name**に`OPENCODE_API_KEY`、**Value**に取得したキーを貼り付けます。
5. **Repository access**で`ryu-yoshikawa-pro-vision/qa-training-store`を選択し、**Add secret**で保存します。ほかのリポジトリを不要に許可しないでください。

**データ保護にも注意してください。** OpenCode Zenの[Privacy説明](https://opencode.ai/docs/zen/#privacy)によると、一部Freeモデルでは入力データがモデル改善に利用される場合があります。送信先のモデルと利用条件を確認し、業務上の機密情報・実在する顧客情報・個人情報を、許可なく入力しないでください。

これでGitHub側のSecret登録は完了です。**APIキーの値をリポジトリ、`.env`、`devcontainer.json`、Issue、PR、ターミナルの出力に書かないでください。** 個人のSecretと、リポジトリのSettingsにある共通Secretは異なります。今回は個人のSecretを利用します。操作の詳細は[GitHub公式のCodespaces Secret手順](https://docs.github.com/en/codespaces/managing-your-codespaces/managing-your-account-specific-secrets-for-github-codespaces)を参照してください。

すでにCodespaceを起動している場合は、[Your codespaces](https://github.com/codespaces)から対象を**Stop codespace → 再度開く**の順に操作してください。新しく作成するCodespaceには作成時にSecretが反映されます。

## 2. Codespaceを作成する

1. [リポジトリ](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store)を開き、緑の**Code**ボタンから**Codespaces**タブを選びます。
2. **Create codespace on main**をクリックします。別のbranchで作業したい場合は、作成時に対象branchを選択してください。
3. ブラウザ版VS Codeが表示されたら、最初のインストールが完了するまで、作成ログを確認します。`postCreateCommand`は、依存ライブラリ、OpenCode、Codex、Playwrightのブラウザを自動でインストールする処理です。
4. メニューの**Terminal → New Terminal**でターミナルを開き、次を入力します。

```bash
node --version
pnpm --version
gh --version
opencode --version
codex --version
```

いずれもバージョンが表示されれば、必要なコマンドが見つかっています。エラーがなく準備が終われば、**Webを起動したい人は第5章**、OpenCodeやCodexを使う人はそれぞれ第3・4章へ進んでください。

`command not found`などが出た場合は、Codespaceの作成ログ（**View Creation Log**）からインストールの失敗を確認してください。必要な変更を保存済みであれば、コマンドパレットの**Codespaces: Rebuild Container**による再構築も候補ですが、原因が分からないまま繰り返さず、エラー内容を確認してください。ログを他人と共有する際はAPIキーや認証情報が含まれていないか確認してください。

## 3. OpenCode Zenを利用する

### 3-1. Secretが渡されているか確認する

Codespaceのターミナルで次を実行します。**APIキーの中身は表示しません。**

```bash
if [ -n "$OPENCODE_API_KEY" ]; then
  echo "OPENCODE_API_KEY: 設定済み"
else
  echo "OPENCODE_API_KEY: 未設定"
fi
```

**設定済み**なら次へ進みます。**未設定**なら、第1章のSecret名とRepository accessを確認し、Codespaceを停止して再開してください。この表示は環境変数が存在することだけを示し、APIキーの有効性や接続成功を保証しません。

### 3-2. OpenCodeにSecretを参照させる

OpenCode V2には環境変数を利用するプロバイダー設定があります。設定ファイルには**Secret名だけ**を書き、APIキーの値は書きません。[OpenCode V2のプロバイダー設定](https://opencode.ai/v2/docs/providers)を参照してください。

1. ターミナルで`mkdir -p ~/.config/opencode`を実行します。
2. `code ~/.config/opencode/opencode.json`を実行し、VS Codeでファイルを開きます。ファイルがまだない場合は新しく作成します。
3. 既存の設定が**ない場合**は、次の内容を入力して保存します。

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

既存の設定が**ある場合はファイル全体を置き換えないでください**。変更前に`cp ~/.config/opencode/opencode.json ~/.config/opencode/opencode.json.bak`でバックアップを取り、既存の`providers`内に`opencode`の設定を統合します。JSONの構造が分からない場合は無理に編集せず、設定内容からAPIキーなどの値を除いて相談してください。設定ファイルはCodespace内の利用者ホームに保存し、リポジトリへcommitしません。

この明示設定は、Codespaces Secretの値をOpenCode側で参照する意図を明確にするためのものです。OpenCode V2の標準接続で環境変数を自動検出する場合もあります。`/connect`でキーを貼り付けて保存する方式は、今回の標準手順には含めません。

### 3-3. 起動・モデル選択・接続確認

ターミナルで次を実行します。

```bash
opencode
```

OpenCodeの画面で`/models`を入力し、**OpenCode Zenのモデル**を選択します。利用前に[公式の料金一覧](https://opencode.ai/docs/zen/#pricing)で**Free**と確認できるモデルだけを選び、有料モデルは選択しないでください。

まず**ファイルを変更しない簡単な質問**を送信し、応答とエラーの有無を確認します。終了後に`git status --short`で意図しないファイル変更がないことも確認してください。

**注意：応答の成功はAPIキー認証の証明ではありません。** Freeモデルはキーなしでも応答できる場合があり、既存の保存済み認証情報が環境変数より優先される場合もあります。個人Secret経由の動作を検証するときは、保存済み認証情報のない**新規Codespace**でSecretの存在と設定の反映を確認し、利用可能ならOpenCode Zen側のアカウント利用履歴と照合します。履歴だけでキー利用を特定できない場合、**認証経路は未確認**と記録してください。APIキー自体や認証データベースの内容を表示・共有しないでください。

`providers.opencode.env`の形式は公式仕様に沿っていますが、**このリポジトリの固定CLIと個人Codespaces Secretを組み合わせた実機認証は未検証です**。確認できるまで「Secretによる認証成功」を保証する手順ではありません。エラー時はSecretのRepository access、Codespaceの停止・再開、環境変数の設定有無、設定ファイル、モデルの選択、表示されたエラーをこの順で確認します。**Secret登録だけで無料利用が保証されるわけではありません。**

なお、PR #188ではOpenCode CLIの動作は確認済みですが、VS CodeのOpenCode拡張は起動時のオプション不一致で利用できません。**OpenCodeはターミナルから起動してください。**

## 4. Codex CLIを利用する

Codespacesはリモート環境のため、Codex CLIのdevice-code認証を使います。

1. [ChatGPT](https://chatgpt.com/)へログインし、**Settings → Security（またはSecurity and login）**を開き、Codexの**device-code sign-in / authorization**を有効にします。画面の項目名は変更される場合があります。組織のChatGPTワークスペースでは、管理者側の許可が必要です。
2. Codespaceのターミナルで次を実行します。

```bash
codex login --device-auth
```

表示されたURLを**自分のブラウザで開き**、同じChatGPTアカウントでログインして一時コードを入力します。コードは第三者へ共有しないでください。

認証が完了したらターミナルに戻り、認証状態を確認してからCodexを起動します。

```bash
codex login status
codex
```

ログインできない場合は、ChatGPT側のdevice-code設定とアカウントを確認し、新しく生成したコードで再実行してください。[Codex公式認証手順](https://developers.openai.com/codex/auth)も参照してください。検証用・共有用のCodespaceを手放す場合は`codex logout`でログアウトします。APIキーやローカル認証キャッシュをコピーして利用する運用はしません。

VS CodeのCodex拡張`OpenAI.chatgpt`も導入されますが、PR #188では拡張の全操作は未検証です。CLIを確実な利用経路としてください。

## 5. Webアプリを起動する

ターミナルで次を実行します。

```bash
pnpm run start:web
```

**このコマンドはWebサーバーを起動し続けるため、ターミナルが操作待ちに戻らなくても正常です。** VS Code画面下部のターミナル領域で**Ports**タブを開き、`qa-training-store (8081)`の行から**ブラウザで開く**操作を選択してください。Storefrontに「決定的なシナリオで、確かなテストを。」という見出しが表示されれば、PR #188と同じ起動確認ができています。

8081が表示されない場合は、`pnpm run start:web`を実行したターミナルにエラーが出ていないかと、8081番で起動しているかを先に確認してください。ポートの公開範囲は**Private**のままにし、**Publicには変更しないでください**。終了するときは起動したターミナルで`Ctrl+C`を押します。

## 6. Playwrightでテストと録画を行う

**既存のE2Eテスト**を実行する場合は、通常いったん第5章の開発サーバーを`Ctrl+C`で停止してから次を実行します。Playwrightは設定に従ってテスト用Webサーバーを起動します。既に8081番のサーバーが起動していると、ローカルではそのサーバーを再利用する設定なので、意図しない状態のサーバーをテストしないように注意してください。

```bash
pnpm run test:e2e:chromium
```

コマンドが正常終了し、失敗したテストがなければ成功です。失敗した場合は最後の失敗数とエラーを確認してください。別の`pnpm run verify`はformat・lint・型・単体テスト・ビルドなどを確認しますが、**Playwright E2Eは含みません**。E2Eの成功と`verify`の成功は別に判断してください。

**録画練習**では、ターミナルを2つ開き、片方でWebアプリを起動したまま、もう片方で録画コマンドを実行します。

**ターミナル1：**

```bash
pnpm run start:web
```

**ターミナル2：**

```bash
pnpm exec playwright codegen http://127.0.0.1:8081
```

**Ports**タブから**Playwright Desktop (6080)**を開くと、Codespace内で動いているChromium（ブラウザ）とPlaywright Inspector（操作の記録・確認画面）を表示できます。表示にはnoVNCというリモート画面転送機能を使っています。

`6080`は**Private**のままとし、`5901`は公開しないでください。

### 録画結果をテストとして実行する

1. noVNC画面の**Chromium**で、Storefrontの画面上にあるリンクなどを1回クリックします。**Playwright Inspector**に`page.goto`や`click`などの操作コードが追加されたことを確認します。これは操作動画の保存ではなく、**再実行できるコードの生成**です。
2. Inspectorで録画を停止し、**Copy**で生成コード全体（`import`と`test(...)`を含む）をコピーします。
3. VS Codeで`e2e/web/practice-phase1-required.spec.ts`という**練習用の新規ファイル**を作り、コードを貼り付けて保存します。**既存のテストファイルを上書きしないでください。**
4. 別のターミナルで以下を実行します。録画用Webサーバーは起動したままで構いません。

```bash
pnpm exec playwright test e2e/web/practice-phase1-required.spec.ts --project=chromium
```

テスト結果に`passed`が表示され、失敗がなければ再実行成功です。失敗した場合は、録画時の操作と画面の状態が同じかを確認します。

`chromium`プロジェクトには`testMatch`によるファイル名の制限があり、通常の`pnpm run test:e2e:chromium`は既存の3ファイルを明示的に指定しています。したがって練習用の`practice-phase1-required.spec.ts`は**上記の個別コマンド**で実行してください。例えば`recorded.spec.ts`という任意のファイル名にすると対象外になります。

終了後、練習用ファイルを正式な変更へ含めない場合は`git status --short`で確認し、`rm e2e/web/practice-phase1-required.spec.ts`で削除します。録画したコードを正式なテスト資産へ追加する場合は、既存のテスト設計・命名・検証方針に従って別途判断してください。

PR #188ではGUIとCLIの`codegen`は確認済みですが、Playwright拡張の`Testing`サイドバー、`Record new`、`Record at cursor`の個別動作は未検証です。

## 7. 変更を保存してPull Requestを作成する

Gitで使う用語は次の意味です。**branch**は変更を分ける作業場所、**commit**は変更の記録、**push**は記録した変更のGitHubへの送信、**Pull Request（PR）**は変更内容を確認してもらうための申請です。

以下は**実際に変更を提出する権限と作業依頼がある場合の例**です。練習だけのためにREADMEを変更してPRを作る必要はありません。リポジトリへ直接pushするには書き込み権限が必要です。権限がない場合は管理者に相談し、必要なら[GitHubのFork方式](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/about-forks)を利用してください。

まずターミナルで現在の状態を確認し、作業用branchを作ります。以下の`docs/example-change`は例なので、作業内容に合う名前へ変更してください。

```bash
git status --short
git branch --show-current
git switch -c docs/example-change
```

例えば`README.md`を編集した場合は、保存後に次を実行します。

```bash
git diff --check
git status --short
git add README.md
git commit -m "docs: READMEの説明を更新"
git push -u origin docs/example-change
```

`git add README.md`はREADMEだけを対象にする例です。別のファイルを編集した場合はそのパスへ置き換えてください。`nothing to commit`と出た場合は変更が保存されているか、`git status --short`を確認してください。

push後にGitHubでリポジトリを開き、**Compare & pull request**（表示されなければ**Pull requests → New pull request**）をクリックします。**base = main**、**compare = 自分の作業branch**であることを確認し、変更内容と検証結果を記載して**Create pull request**を選びます。作成したPRの画面が開けば完了です。[CONTRIBUTING.md](../../CONTRIBUTING.md)と[AGENTS.md](../../AGENTS.md)に従い、必要なテスト・CIも確認してください。

## 8. Codespaceを停止・再開・削除する

1. [Your codespaces](https://github.com/codespaces)を開きます。
2. 対象の`…`メニューから**Stop codespace**で停止します。再開時は一覧のCodespace名をクリックして開きます。
3. 不要になったCodespaceは、未commit・未pushの変更が残っていないことを確認してから、同じメニューの削除操作で削除します。

**ブラウザのタブを閉じるだけでは停止しません。** 停止中も保存領域の料金が発生する場合があります。作業終了時には停止し、料金・無料枠・利用時間は[GitHub公式のライフサイクル説明](https://docs.github.com/en/codespaces/about-codespaces/understanding-the-codespace-lifecycle)で確認してください。

`devcontainer.json`の設定が変更された場合は、必要に応じてCodespaceを再構築します。再構築前に必要な変更をcommit・pushしてください。

## 9. 既知の制約と導入記録

- PR #188ではOpenCode CLIは動作確認済みです。ただしVS Code拡張`sst-dev.opencode`は、起動時の`opencode --port 65147`を固定CLIが受け付けず、起動できないことが確認されています。解決するまではCLIを使ってください。
- Android / iOSのNative BuildはCodespacesの対象ではありません。
- [Codespaces環境導入Plan](../plans/2026-10-02_173400_codespaces-opencode-devcontainer.md)と[IDE・Playwright導入Plan](../plans/2026-10-04_160000_codespaces-ide-playwright-recording.md)はPR #188当時の設計・検証記録です。当時の「FreeモデルをAPIキーなしで検証」と、通常利用で「個人Secretを使う」運用は異なります。
