# コントリビュート

Scenario Shopへ変更を加える際の、必要最小限の案内をまとめます。

## 最初に確認する文書

1. [`AGENTS.md`](./AGENTS.md)
2. [`docs/PROJECT_CONTEXT.md`](./docs/PROJECT_CONTEXT.md)
3. [`docs/CODING_STANDARDS.md`](./docs/CODING_STANDARDS.md)
4. [`docs/WRITING_STANDARDS.md`](./docs/WRITING_STANDARDS.md)
5. 変更領域に関係する[`docs/adr/`](./docs/adr/)
6. レビュー時は[`CODE_REVIEW.md`](./CODE_REVIEW.md)

`AGENTS.md`は作業手順、`PROJECT_CONTEXT.md`は現在の設計と運用前提、`CODING_STANDARDS.md`はコードの判断基準、`WRITING_STANDARDS.md`は人間向け文書の言語と表現の基準を扱います。内容が重複する場合は、より具体的な領域の文書を優先します。

## 基本方針

- 新規コードおよび変更コードにコーディング規約を適用する。
- 規約導入だけを目的とした既存コードの一括変更は行わない。
- 差分は必要な範囲に限定し、無関係なリファクタリングを混在させない。
- 既存のアーキテクチャ契約とプラットフォーム依存関係チェックを維持する。
- 実行していない検証を成功として記録しない。

## Issue / Pull Request / セキュリティ

- 不具合報告は [不具合報告用Issueフォーム](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/new?template=bug_report.yml) を使用する。
- 機能要望は [機能要望用Issueフォーム](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/issues/new?template=feature_request.yml) を使用する。
- Pull Requestは [Pull Request用テンプレート](./.github/pull_request_template.md) を使用し、検証結果と対象範囲・対象外の事項を記載する。
- セキュリティ上の脆弱性は公開のIssueやPull Requestには投稿せず、[`SECURITY.md`](./SECURITY.md)に記載されているGitHub Private Vulnerability Reportingを使用する。

## 依存関係・ワークフローの変更

- 依存関係のバージョン更新には、既知の脆弱性、サポート終了（EOL）、互換性の問題、計画済みの基盤更新、新機能のいずれかの理由を記載する。単に最新であるという理由だけで更新しない。
- GitHub Actionsのリモート`uses:`は完全なコミットSHAで固定し、変更時には公式ソース、リリースタグ、セキュリティアドバイザリを確認する。
- Dependabot Version UpdatesやRenovateなど、通常の自動バージョン更新は有効化しない。
- Dependabot Security Updatesは通常のバージョン更新とは区別して扱い、Public Repository Hardeningのマージ後タスクとして有効化・検証する。
- フォークされたPRではCloudflare Preview Deploymentを実行しない。

## 実装前

- 変更対象のエントリポイント、依存関係の方向、既存テストを確認する。
- 外部入力値、ストレージ、SQLite、ディープリンク、環境変数を扱う場合は、あらかじめ検証境界を決めておく。
- Webとネイティブのどちらに影響するかを明確にする。
- 複雑な変更を行う場合は、`PLANS.md`およびリポジトリ固有の計画スキルに従って計画を保存する。

## 実装時

特に次の点を確認する。

- 通常の型定義に`type`を使用しているか
- `as`や`!`で型エラーを隠していないか
- 相関する状態を判別可能なユニオン型で表現できないか
- 型、選択肢、型ガードの正本が重複していないか
- アプリケーション層がインフラストラクチャ層の具象実装に依存していないか
- プラットフォーム固有の依存が共通モジュールへ漏れ出ていないか
- エラーを捕捉する目的が明確か
- テストを通すためだけの固定待機やタイムアウト延長を追加していないか

詳細は[`docs/CODING_STANDARDS.md`](./docs/CODING_STANDARDS.md)を参照する。

## 検証

変更内容に応じて必要な検証を実行する。

```bash
pnpm run format:check
pnpm run lint:markdown
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build:web
```

Markdown文書を変更した場合は、通常の品質検証に加えて`pnpm run lint:markdown`を実行する。`pnpm run verify`にも同じMarkdown品質ゲートが含まれる。

全体検証を実行する標準的なコマンドは次のとおりとする。

```bash
pnpm run verify
```

プラットフォーム固有の変更では、対象に応じてWeb E2E、アクセシビリティ、ネイティブコンポーネントテスト、SQLite契約テスト、Android／iOSのローカルビルド、Maestroも実行する。

実行環境の制約などで実施できない検証がある場合は、未実行の項目、その理由、および残存するリスクを報告する。

## レビュー

レビューは[`CODE_REVIEW.md`](./CODE_REVIEW.md)に従って行う。

- 差分に起因する問題のみを指摘事項として扱う。
- 単なる好みや同等な別表現を必須の修正事項としない。
- 規約違反であっても、実害がなく変更範囲外である既存の問題は、別対応として切り分ける。
- 修正案は最小限の差分を優先する。
