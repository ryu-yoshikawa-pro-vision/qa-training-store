# GitHub Codespaces利用ガイド

このガイドは、`qa-training-store`をGitHub Codespacesで開き、Web開発・テスト・AIエージェントを日常的に利用するための手順です。初回作成時の設定は[`devcontainer.json`](../../.devcontainer/devcontainer.json)から自動適用されます。

Codespacesは主にWeb / TypeScript開発向けです。Android / iOSのNative Buildは、従来どおりWindows / macOSのローカル環境で行います。

## 1. Codespaceを作成する

1. [リポジトリ](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store)を開き、`Code → Codespaces`を選びます。
2. `Create codespace on main`から作成します。別のbranchを使う場合は、作成前に対象branchを選択してください。
3. ブラウザ版VS Codeが開き、`postCreateCommand`による依存関係・CLI・Chromiumのインストールが完了することを確認します。初回はインストールが必要です。
4. VS Codeの`Terminal → New Terminal`で、以下を実行します。

```bash
node --version
pnpm --version
gh --version
opencode --version
codex --version
```

エラーがあれば`View Creation Log`などから作成時のログを確認してください。インストールが失敗したまま通常開発を始めないでください。

GitHubアカウントや組織の設定によって、Codespacesの利用権限や費用負担は異なります。

## 2. OpenCode Zenを個人のCodespaces Secretで利用する

**通常利用では各利用者が自分のOpenCode Zen APIキーを取得し、個人アカウントのCodespaces Secretへ保存します。** APIキーをリポジトリ、`.env`、`devcontainer.json`、Issue、PR、ログへ記載しないでください。

1. [OpenCode Zen](https://opencode.ai/docs/zen/)で各自のアカウントにサインインし、APIキーを取得します。課金設定や利用上限は各自で確認してください。
2. GitHubのプロフィールから`Settings → Codespaces → Codespaces secrets → New secret`を開きます（[GitHub公式手順](https://docs.github.com/en/codespaces/managing-your-codespaces/managing-your-account-specific-secrets-for-github-codespaces)）。
3. `Name`に`OPENCODE_API_KEY`、`Value`に取得したAPIキーを入力します。
4. `Repository access`で`ryu-yoshikawa-pro-vision/qa-training-store`だけを許可して保存します。個人Secretであり、リポジトリ共通のSecretにはしません。
5. 既にCodespaceを起動している場合は、いったん停止して再開し、Secretを反映します。

Codespaceのターミナルで、**値を表示せず**環境変数が渡されたか確認します。

```bash
if [ -n "$OPENCODE_API_KEY" ]; then
  echo "OPENCODE_API_KEY: 設定済み"
else
  echo "OPENCODE_API_KEY: 未設定"
fi
```

環境変数が設定済みであることと、OpenCodeがそのキーを利用して接続できることは別の確認項目です。

```bash
opencode
```

OpenCode内で`/models`からOpenCode Zenのモデルを選び、接続と応答を確認します。従来のPR #188の検証ではFreeモデルをキーなしで動作確認しましたが、**通常利用では個人Secretを使う方針**です。Freeモデルがキーなしで応答しても、APIキー経由の接続確認にはなりません。

このリポジトリではモデルを固定していません。**使用するモデルがOpenCode Zenの[現在の料金一覧](https://opencode.ai/docs/zen/#pricing)でFreeであることを呼び出し前に確認し、有料モデルは選択しないでください。** Secretを保存しただけでは有料利用を防止できません。

### APIキーがOpenCodeへ渡らない場合

現在の導入CLIはOpenCode V2です。Codespaces Secretを定義してもOpenCodeへの接続が確認できない場合は、利用者個人の`~/.config/opencode/opencode.json`で環境変数を認証情報として参照させます（[OpenCode V2のプロバイダー設定](https://opencode.ai/v2/docs/providers/)）。既存の設定がある場合は**上書きせず**、`providers.opencode`の設定を追加・統合してください。

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

このファイルにはキーの**値**を書きません。設定は各自のホームディレクトリ内だけに保存し、リポジトリへcommitしないでください。接続できない場合は、Secretの`Repository access`、Codespaceの再起動、モデル選択、OpenCodeのエラーを順に確認します。通常開発で`/connect`からキーを直接保存する運用は、本ガイドの標準手順にはしません。

## 3. Codex CLIを利用する

Remote CodespaceではChatGPT側でdevice-code認証を有効にしたうえで、ターミナルから次を実行します。案内された認証URL・コードを使って自分のChatGPTアカウントでログインします。

```bash
codex login --device-auth
codex login status
codex
```

共有・検証用のCodespaceを手放すときは`codex logout`で認証を解除してください。APIキーやローカルの認証キャッシュをコピーして利用する運用はしません。

VS CodeにはCodex拡張`OpenAI.chatgpt`も導入されます。PR #188では拡張のインストールを確認していますが、すべてのIDE操作を個別に実測したわけではありません。CLIを確実な利用経路としてください。

## 4. Webアプリを起動する

ターミナルで次を実行します。

```bash
pnpm run start:web
```

VS Codeの`Ports`タブから`qa-training-store (8081)`を開き、ブラウザでStorefrontを表示します。転送したポートは`Private`のままにし、不要な公開設定をしないでください。終了するときは起動したターミナルで`Ctrl+C`を実行します。

## 5. Playwrightで実行・録画する

テスト実行とリポジトリ全体の検証には、次の既存コマンドを利用できます。

```bash
pnpm run test:e2e:chromium
pnpm run verify
```

録画する場合は、別のターミナルで`pnpm run start:web`を起動してから、以下を実行します。

```bash
pnpm exec playwright codegen http://127.0.0.1:8081
```

`Ports`タブから`Playwright Desktop (6080)`を開くと、noVNC経由でCodespace内のChromiumやPlaywright Inspectorを操作できます。`6080`は`Private`を維持し、`5901`は公開しないでください。

PR #188では`6080`、noVNC、ChromiumのGUI、CLI版`codegen`の動作を確認しています。VS CodeのPlaywright拡張は導入済みですが、`Testing`サイドバー、`Record new`、`Record at cursor`などの個別操作は確認済みと扱わないでください。

## 6. 変更を保存してPRを作成する

編集前に、作業対象のbranchを確認します。`main`で直接作業せず、作業用branchを作成してください。

```bash
git status --short
git branch --show-current
git switch -c docs/example-change
```

変更後は差分を確認し、必要なファイルだけを`git add`してください。

```bash
git diff --check
git status --short
git add <変更したファイル>
git commit -m "docs: 変更内容を記載"
git push -u origin docs/example-change
```

GitHubのbranch画面からPull Requestを作成し、[`CONTRIBUTING.md`](../../CONTRIBUTING.md)と[`AGENTS.md`](../../AGENTS.md)に従って検証結果と対象範囲を記載します。作業内容に応じて既存のテスト・CIを実行してください。`docs/example-change`は例示名のため、実際の作業に合わせて変更します。

## 7. 停止・再開・削除と料金管理

- 一覧は[Your codespaces](https://github.com/codespaces)から開けます。対象Codespaceのメニューで`Stop codespace`、再開時は`Open in browser`などを使用します。
- **ブラウザのタブを閉じるだけでは停止しません。** 作業終了時は明示的に停止してください。
- 停止中も保存領域の費用が発生する場合があります。不要になったCodespaceは、未commit・未pushの変更がないことを確認してから削除します。
- 料金、無料枠、費用負担、停止時間はGitHubの設定・プランに依存します。[Codespacesのライフサイクル](https://docs.github.com/en/codespaces/about-codespaces/understanding-the-codespace-lifecycle)と各自のGitHub利用状況を確認してください。
- Dev Container設定が更新された場合は、必要に応じてCodespaceを再構築します。再構築前に必要な変更をcommit・pushしてください。

## 8. 既知の制約

- OpenCode CLIはPR #188で確認済みです。一方、VS Code拡張`sst-dev.opencode`は、起動時に渡す`opencode --port 65147`を固定CLIが受け付けず、起動できないことが確認されています。解消するまではCLIを使ってください。
- Native BuildはCodespacesの対象ではありません。
- PR #188の環境導入・検証Planは[Codespaces環境導入Plan](../plans/2026-10-02_173400_codespaces-opencode-devcontainer.md)と[IDE・Playwright導入Plan](../plans/2026-10-04_160000_codespaces-ide-playwright-recording.md)です。過去の「キーなしFreeモデル検証」と本ガイドの「通常利用では個人Secretを使用」は別の方針です。
