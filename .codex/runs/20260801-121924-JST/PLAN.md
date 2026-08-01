# Plan

## Objective
- 起動済みの `qa-training-store` を Playwright MCP で実操作し、UI・UX上の明確な問題を再現可能な根拠付きで探索し、指定形式のMarkdownレポートとしてまとめる。

## Scope
- In: `http://localhost:8081/` の Storefront、Seedで利用可能なCustomer、Operator/Admin画面、Desktop/Tablet/Mobile/Small Mobileの主要導線、ScreenshotとAccessibility Snapshot、必要最小限のソース読取による原因候補の特定。
- Out: コード・設定・テスト・依存関係・既存ドキュメントの変更、アプリの起動/停止、Git操作、Scenarioの永続変更、UIの一時変更、Playwright Test/CLIなど別のブラウザ操作手段。

## Assumptions
- READMEに記載されたSeedアカウントを使用し、パスワードはREADME記載値だけを利用する。
- Test Control/Scenario変更は、独立したBrowser Context内で状態を保証できる場合に限り、探索に必要な範囲で行う。
- Playwright MCPの独立Contextを確保できない場合は探索不能として終了する。

## Questions / Ambiguity
- 必ず質問する不透明点: なし。
- 仮定してよい細部: 主要画面の網羅性は、接続可否・認証・時間の制約を踏まえて、完了済み/一部確認/未確認を明示する。
- 未回答の重要質問: なし。

## Hypotheses
- H1: Storefrontの共通Header、商品一覧/詳細、Cart、CheckoutのResponsive境界に、主要操作の視認性または横幅制約に関する問題が存在する可能性がある。
- H2: Adminの一覧・編集画面はDesktop前提の設計だが、1024px境界や小画面Warningとの関係で操作性の問題が存在する可能性がある。
- H3: Login/Customer/Order/Reviewの状態表示または文言に、実操作で理解しにくい箇所が存在する可能性がある。

## Research Plan
- Round 1 Query: Playwright MCPの利用可否と独立Browser Contextを確認し、URLへ接続、Desktop初期画面のScreenshot/Snapshot/Consoleを取得する。
- Round 2 Query: README・E2E Fixture・Seedを根拠にRole/Scenarioを選び、主要画面を操作してDesktop/Mobile/Small Mobileを比較し、問題は最大2回まで再確認する。
- Round 3 Query: 発見事項と関連画面をソースのread-only確認で照合し、指定のレポート形式に整理する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach
- Browser skillの手順でPlaywright MCPの独立Contextを接続する。
- 主要導線ごとに画面表示、Screenshot、Accessibility Snapshot、主操作、操作後状態を確認する。
- ViewportをDesktop 1440x1000、Tablet 1024x900、Mobile 390x844、必要箇所でSmall Mobile 320x700へ変更する。
- 問題はSeverity基準に沿って過大評価せず、再現手順・影響・証拠・原因候補・確信度を記録する。
- 探索後、製品ファイルの差分がないことを読み取り専用で確認し、最終回答を指定Markdown構成で出力する。

## Definition of Done
- Playwright MCPで実画面を操作し、ScreenshotとAccessibility Snapshotの両方を取得する。
- Home、商品一覧、商品詳細、Cart、LoginのDesktop/Mobileを最低限確認し、可能な範囲でCustomer/Adminも確認する。
- 明確な問題は再現性を確認して重複を整理し、未確認範囲を明示する。
- コード・設定・テスト・依存関係・アプリ状態・Gitを変更しない。
- 指定されたMarkdownレポート構成を満たす。

## Risks / Unknowns
- 独立Contextが確保できない、ScreenshotまたはSnapshotが取得できない場合は開始/継続せず終了する。
- 認証情報やScenarioが不足するRoleは推測せず未確認とする。
- checkout/注文など状態を持つ操作は、独立Context内で完結し、実注文データの永続的な影響がない教材仕様の範囲に限定する。
- ScreenshotはPlaywright MCPの一時Artifactとして扱い、リポジトリファイルを上書きしない。

## Thinking Log
- 思考や判断の理由はここに逐次追記する（作業中に更新）。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。
- 2026-08-01 12:19 JST: 既存の前回RunはPlaywright MCP未登録の切り分けで完了していたが、今回セッションでは `mcp__playwright__*` ツールが登録されているため、今回の指示どおり実画面探索へ進む。
