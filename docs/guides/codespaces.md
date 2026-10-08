# GitHub Codespaces利用ガイド

このガイドは、`qa-training-store`をGitHub Codespacesで開き、Webアプリの開発・テストやAIエージェントの操作を始めるための手順です。

GitHub Codespacesは、ブラウザ上のVS Codeから利用できる開発環境です。自分のPCにNode.jsなどをインストールせずに、リポジトリのファイルを編集できます。画面下部の**ターミナル**は、コマンドを入力する場所です。初回の環境準備は[`devcontainer.json`](../../.devcontainer/devcontainer.json)に従って自動実行されます。

初めて使う場合は**1 → 2 → 3**の順に進めてください。OpenCode Zenを使わない場合はSecret設定を飛ばしても、Web開発とPlaywrightは利用できます。

Codespacesで対応するのは主にWeb / TypeScript開発です。Android / iOSのNative Buildは、従来どおりWindows / macOSのローカル環境で行います。

## 1. 利用前にOpenCode ZenのSecretを登録する

**OpenCode Zenを利用する人は、自分のAPIキーをGitHubアカウントのCodespaces Secretに登録します。** SecretはパスワードなどをGitHubに安全に保存し、許可したリポジトリのCodespaceへ環境変数として渡す機能です。

1. [OpenCode Zen](https://opencode.ai/docs/zen/)にサインインし、自分のAPIキーを取得します。必要なアカウント設定・課金設定と利用上限は各自で確認してください。
2. GitHub右上のプロフィール画像から**Settings → Codespaces**を開きます。[個人のCodespaces設定](https://github.com/settings/codespaces)からも移動できます。
3. **Codespaces secrets → New secret**を選択します。
4. **Name**に`OPENCODE_API_KEY`、**Value**に取得したキーを貼り付けます。
5. **Repository access**で`ryu-yoshikawa-pro-vision/qa-training-store`を選択し、**Add secret**で保存します。ほかのリポジトリを不要に許可しないでください。

これでGitHub側の準備は完了です。**APIキーの値をリポジトリ、`.env`、`devcontainer.json`、Issue、PR、ターミナルの出力に書かないでください。** 個人のSecretと、リポジトリのSettingsにある共通Secretは異なります。今回は個人のSecretを利用します。操作の詳細は[GitHub公式のCodespaces Secret手順](https://docs.github.com/en/codespaces/managing-your-codespaces/managing-your-account-specific-secrets-for-github-codespaces)を参照してください。

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

いずれもバージョンが表示されれば、必要なコマンドが見つかっています。`command not found`などが出た場合は、**View Creation Log**などで作成時の失敗を確認してください。インストールに失敗した状態では次へ進まないでください。

GitHubアカウントや組織の設定によって、Codespacesの利用権限や費用負担は異なります。

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

**設定済み**なら次へ進みます。**未設定**なら、手順1のSecret名とRepository accessを確認し、Codespaceを停止して再開してください。この表示は環境変数が存在することだけを示し、APIキーの有効性や接続成功を保証しません。

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

既存の設定が**ある場合はファイル全体を置き換えず**、`providers.opencode.env`に`OPENCODE_API_KEY`を追加・統合します。既存のJSONに慣れていない場合は、設定を上書きする前に確認してください。ファイルはCodespace内の利用者ホームに置き、リポジトリへcommitしません。

この明示設定は、Codespaces Secretの値をOpenCode側で参照する意図を明確にするためのものです。OpenCode V2の標準接続で環境変数を自動検出する場合もあります。`/connect`でキーを貼り付けて保存する方式は、今回の標準手順には含めません。

### 3-3. 起動・モデル選択・接続確認

ターミナルで次を実行します。

```bash
opencode
```

OpenCodeの画面で`/models`を入力し、**OpenCode Zenのモデル**を選択します。利用前に[公式の料金一覧](https://opencode.ai/docs/zen/#pricing)で**Free**と確認できるモデルだけを選び、有料モデルは選択しないでください。

短い質問を送信して応答が返ることを確認します。ただし、Freeモデルはキーなしでも応答できる場合があります。**応答が返っただけでは、登録したキーで認証した証明にはなりません。** キーを使った接続の成否は、モデル側の認証エラーの有無やOpenCode Zenアカウントの利用状況も確認してください。キー経由での実機接続はPR #188の検証対象外であり、本ガイド作成時点でも未検証です。

エラー時はSecretのRepository access、停止・再開、ターミナルの設定有無、設定ファイル、モデルの選択、表示されたエラーをこの順で確認します。**Secret登録だけで無料利用が保証されるわけではありません。**

## 4. Codex CLIを利用する

Codespacesはリモート環境のため、Codex CLIのdevice-code認証を使います。

1. [ChatGPT](https://chatgpt.com/)へログインし、**Settings → Security（またはSecurity and login）**を開き、Codexの**device-code sign-in / authorization**を有効にします。画面の項目名は変更される場合があります。組織のChatGPTワークスペースでは、管理者側の許可が必要です。
2. Codespaceのターミナルで次を実行します。

```bash
codex login --device-auth
```

3. ターミナルに表示されたURLを**自分のブラウザで開き**、同じChatGPTアカウントでログインして表示された一時コードを入力します。コードは第三者へ共有しないでください。
4. ターミナルに戻り、認証済みと表示されるか確認してから起動します。

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

VS Codeの**Ports**タブには、Webアプリの`qa-training-store (8081)`が表示されます。これはCodespace上のWebサーバーをブラウザから開くためのポートです。開いた先にStorefrontが表示されれば起動成功です。

ポートの公開範囲は**Private**のままにしてください。終了するときは起動したターミナルで`Ctrl+C`を押します。

## 6. Playwrightでテストと録画を行う

既存のPlaywrightテストとリポジトリ全体の検証には次を利用できます。

```bash
pnpm run test:e2e:chromium
pnpm run verify
```

録画する場合は、ターミナルを2つ開き、片方でWebアプリを起動したまま、もう片方で録画コマンドを実行します。

**ターミナル1：**

```bash
pnpm run start:web
```

**ターミナル2：**

```bash
pnpm exec playwright codegen http://127.0.0.1:8081
```

**Ports**タブから**Playwright Desktop (6080)**を開くと、Codespace内で動いているChromium（ブラウザ）とPlaywright Inspector（操作の記録・確認画面）を表示できます。表示にはnoVNCというリモート画面転送機能を使っています。

`6080`は**Private**のままとし、`5901`は公開しないでください。PR #188ではGUIとCLIの`codegen`を確認済みですが、Playwright拡張の`Testing`サイドバー、`Record new`、`Record at cursor`の個別動作は未検証です。

## 7. 変更を保存してPull Requestを作成する

Gitで使う用語は次の意味です。**branch**は変更を分ける作業場所、**commit**は変更の記録、**push**は記録した変更のGitHubへの送信、**Pull Request（PR）**は変更内容を確認してもらうための申請です。

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

`git add README.md`はREADMEだけを対象にする例です。別のファイルを編集した場合はそのパスへ置き換えてください。GitHubにpushしたbranchからPull Requestを作り、[CONTRIBUTING.md](../../CONTRIBUTING.md)と[AGENTS.md](../../AGENTS.md)に従って対象範囲と検証結果を記載します。必要なテストやCIも変更内容に応じて確認してください。

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
