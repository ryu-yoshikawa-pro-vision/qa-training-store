# Google Docs ↔ Markdown 双方向同期 実装計画

## 0. 依頼概要

- 依頼内容:
  - `docs/spec/**/*.md` と `docs/curriculum/**/*.md` のみを Google Docs と双方向同期できるようにする。
  - 1 Markdown ファイルにつき 1 Google Doc とし、Google Docs のタブ機能は同期単位に使わない。
  - GitHub Actions から OAuth Client / Refresh Token を用いて Google Drive API を呼び出す。
  - Google Docs → Git は Markdown を作成・上書きし、必ずブランチと Pull Request を作成する。
  - Git → Google Docs は既存 Google Doc を同じ Document ID のまま全置換し、対応 Doc がなければ自動作成する。
  - Git 側に新規 Markdown が追加された場合は次回 Git → Google 同期で Google Doc を自動作成する。
  - Google Drive 側に新規 Google Doc が追加された場合は、同期対象ルート配下の正しいフォルダ階層にあり、Markdown ファイル名として解決できるものだけを Google → Git 同期で新規 Markdown として取り込む。
  - 自動削除は実装しない。
  - 両側が前回同期後に変更されている場合は自動上書きせず競合として停止する。
- 背景:
  - 仕様書・カリキュラムを非開発者でも Google Docs 上で編集しやすくしつつ、Git 上の Markdown を引き続き正規のレビュー・履歴・Validator 対象として維持したい。
  - 現在の Repository は `docs/spec/` と `docs/curriculum/` を多数の Markdown に分割しており、1 Markdown = 1 Google Doc の対応が既存構造と自然に一致する。
- 期待成果:
  - 対象 Markdown 全件を Google Docs と双方向同期できる同期スクリプトと GitHub Actions Workflow。
  - 初回 Git → Google 同期で対象全ファイルを作成し、再 export による round-trip 検証を全対象へ実施できること。
  - Google → Git の同期結果が対象 Markdown 以外を変更せず、既存 Validator を通過したうえで PR 化されること。

## 1. ゴール / 完了条件

### ゴール

`docs/spec/**/*.md` と `docs/curriculum/**/*.md` のみを対象とし、Google Docs と GitHub のどちらからでも安全に追加・更新できる、明示方向・競合検知付きの双方向同期を構築する。

### 完了条件（DoD）

- [ ] 同期対象判定が次の 2 パターンだけに固定されている。
  - `docs/spec/**/*.md`
  - `docs/curriculum/**/*.md`
- [ ] 上記以外の Markdown / docs / source / generated artifact は同期対象として列挙・生成・上書きされない。
- [ ] 1 Markdown = 1 Google Doc で同期し、Google Docs の tab API / tab 分割には依存しない。
- [ ] OAuth Client ID / Client Secret / Refresh Token から GitHub Actions 上で Access Token を取得できる。
- [ ] Google Drive API を使って Google Docs を `text/markdown` として export できる。
- [ ] Markdown を Google Docs へ import / update し、既存 Doc は Document ID を維持したまま内容を全置換できる。
- [ ] Git にしかない対象 Markdown は Git → Google 同期で Google Doc を自動作成できる。
- [ ] Google Drive にしかない同期対象 Doc は Google → Git 同期で対象 Markdown を自動作成できる。
- [ ] Google → Git は既存ファイルを上書き、新規ファイルを作成し、対象差分だけを含む PR を作成する。
- [ ] Git → Google は Git 上の対象 Markdown を source として Google Docs を更新し、Repository の不要な変更を発生させない。
- [ ] 同期対象 Doc / Folder と Git path の対応が決定的に解決できる。
- [ ] 同期済み状態を Google Drive の file metadata (`appProperties`) で保持し、Repository に都度 Document ID mapping commit を発生させない。
- [ ] 両側変更を検知した場合は片方を勝手に優先せず、競合として non-zero exit する。
- [ ] 自動削除を行わない。
- [ ] Google → Git 実行時に対象外ファイル差分が生じた場合は PR 作成前に fail する。
- [ ] Google → Git の変更後に Markdown / Spec / Curriculum の Validator を実行し、失敗時は PR を作成しない。
- [ ] 初回 Git → Google の全件同期後、全 Google Doc を再 export して round-trip 検証できる。
- [ ] 現在存在する全対象 Markdown が、round-trip 後も少なくとも Repository の構造契約・リンク契約・Validator を壊さない。
- [ ] Git 新規ファイル追加、Google 新規 Doc 追加、片方向更新、両側競合、対象外 Doc の無視、削除非対応を automated test または明示的 validation で確認する。
- [ ] `pnpm run verify` が最終差分で PASS する。

## 2. 現状理解と前提

### Current understanding

#### Repository 構造

- 仕様書は `docs/spec/` 配下に分割され、さらに `docs/spec/features/` などの下位ディレクトリを持つ。
- カリキュラムは `docs/curriculum/test-automation/` 配下に共通文書、`part1/`、`part2/` 等の Markdown を持つ。
- 対象 Markdown には通常文章だけでなく、以下が含まれる。
  - Markdown table
  - fenced code block
  - relative link
  - relative image link
  - BR / AC 等の識別子
  - 見出し階層
- Repository には既に次の validation entry point がある。
  - `pnpm run lint:markdown`
  - `pnpm run validate:spec`
  - `pnpm run validate:spec-visuals:final`
  - `pnpm run validate:curriculum`
  - `pnpm run build:spec`
  - `pnpm run verify`
- `.github/workflows/expo-dependency-maintenance.yml` には、`contents: write` / `pull-requests: write`、`gh` CLI、automation branch、commit、push、PR 作成の既存 Repository convention がある。
- `scripts/docs/` は現在 `build-docs.ts` を持ち、文書関連スクリプトの配置先として利用されている。
- `package.json` には Google API client dependency は存在しない。

#### Google API 能力

2026-09-07 時点の Google 公式仕様では以下を利用できる。

- Google Docs は Drive API `files.export` で `text/markdown` に export できる。
  - https://developers.google.com/workspace/drive/api/guides/ref-export-formats
- Markdown は Google Docs への import format としてサポートされる。
- Google Docs / Sheets / Slides に対して media を伴う update を行うと document full contents を置換できる。
  - https://developers.google.com/workspace/drive/api/guides/manage-uploads
- OAuth 2.0 の offline access で Refresh Token を保持し、GitHub Actions など user-interactive でない実行から Access Token を取得できる。

### Entry points

実装後の主要 entry point は次の 3 つとする。

1. `pnpm run docs:google:push`
   - Git → Google Docs
2. `pnpm run docs:google:pull`
   - Google Docs → Git working tree
3. `.github/workflows/google-docs-sync.yml`
   - `workflow_dispatch` から方向を明示して上記を呼び出す。

### Main flow

#### Git → Google

1. Repository の対象 Markdown を再帰列挙する。
2. `docs/` より下の相対 path を Google Drive 上の同期ルート配下へ mapping する。
3. 対応 Google Doc が存在すれば Markdown で full update する。
4. 対応 Google Doc が存在しなければ必要な Drive folder と Google Doc を作成する。
5. Google Doc を再度 Markdown export し、Google 側の実体を確認する。
6. 同期 state を `appProperties` に更新する。
7. Repository のファイル自体は変更しない。

#### Google → Git

1. 指定した Google Drive 同期ルート配下だけを走査する。
2. `spec/` または `curriculum/` 配下に対応する Google Docs だけを対象にする。
3. 各 Doc を `text/markdown` export する。
4. Repository canonical formatting に必要な最小 normalize を適用する。
5. 競合がなければ対応 `.md` を上書き、存在しなければ新規作成する。
6. 対象外差分がないことを allowlist で検証する。
7. Validator を実行する。
8. 差分がなければ no-op で終了する。
9. 差分があれば automation branch に commit / push し、main 向け PR を作成する。

### Key abstractions

- **Target path policy**
  - 同期対象 path を判定する pure function。
  - 許可された 2 prefix 以外は fail / ignore を明確化する。
- **Drive path mapper**
  - Git path と Drive folder / Doc の 1:1 対応を解決する。
- **OAuth token provider**
  - Refresh Token から Access Token を取得する side-effect boundary。
- **Drive client**
  - list / create folder / create doc / update doc / export doc / metadata update の HTTP boundary。
- **Sync state / conflict detector**
  - 前回同期 hash と現在 hash を比較し、safe update / no-op / conflict を判定する pure logic。
- **Markdown normalizer**
  - Google export を Repository に戻す際の最小限・決定的な canonicalization。
- **CLI orchestration**
  - direction ごとの列挙・検証・副作用順序を制御する。

### Existing tests

- `tests/unit/` は Vitest による pure logic / service test の既存配置である。
- 新規同期コードも network を直接呼ぶ test ではなく、Drive client boundary を fake / stub 化し、path mapping・競合判定・同期 orchestration を unit test する。
- Live Google API validation は GitHub Actions の manual workflow で分離する。

### Safe change surface

- `.github/workflows/google-docs-sync.yml` の新規追加。
- `scripts/docs/google-docs-sync/**` の新規追加。
- `tests/unit/google-docs-sync*.test.ts` 等の同期ロジック test の新規追加。
- `package.json` の同期 command 追加。
- 必要な場合のみ test / TypeScript 設定へ最小限の追加。
- 初回同期・通常同期で変更してよい文書は次のみ。
  - `docs/spec/**/*.md`
  - `docs/curriculum/**/*.md`

### Unknowns

- Google の Markdown import → Docs → Markdown export が、現在の Repository に含まれる relative image / relative link / table / fenced code block をどの程度 byte-stable に round-trip するかは実 credential を用いた実行まで確定できない。
- そのため実装完了条件は「完全 byte equality」を先に仮定せず、全対象ファイルを初回一括 round-trip して差分を確認し、意味を壊す差分を許容しないこととする。

### Assumptions

- 初回 bootstrap の source は Git の `main` とする。
- OAuth Client と Refresh Token は単一の管理用 Google Account に対して発行する。
- Google Docs 側の同期ルート Folder は事前に 1 つ作成し、その Folder ID を GitHub Actions Variable として設定する。
- Google Drive 上では同期ルート直下に `spec/` と `curriculum/` を作り、Git の `docs/` より下の directory tree を mirror する。
- Google Doc の title は Git の Markdown filename と一致させ、`.md` 拡張子も保持する。
- Google 側から新規 Doc を作る場合も、この mirrored folder tree と `.md` filename rule に従う。
- Google 側で手動作成した Doc の discover / update が必要なため、OAuth scope は `https://www.googleapis.com/auth/drive` を前提とする。
  - API 操作自体は指定同期ルート配下だけに code-level で制限する。
  - Credential 漏えい時の blast radius を抑えるため、可能なら同期専用 Google Account / Drive 領域を利用する。
- 初期版では Service Account / Workload Identity Federation への移行は行わない。

### Non-goals

- `docs/spec/**/*.md` と `docs/curriculum/**/*.md` 以外の同期。
- Google Docs tab 単位同期。
- Google Docs comments / suggestions / revision history を Git へ変換すること。
- Git commit history を Google Docs revision history と対応させること。
- 自動削除・Trash 移動・rename 同期。
- 「更新日時が新しい方を自動採用する」Last Writer Wins。
- main への Google → Git 直接 push。
- GitHub Actions 以外の常駐同期 service。
- Service Account / WIF への認証方式変更。

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

- なし。今回の会話で実装方向を決められるだけの契約が確定している。

### 仮定してよい細部

- Drive 同期ルートの表示名。
- Google Doc title の prefix / decoration は付けず、`.md` filename をそのまま使う。
- automation branch 名の timestamp / run id 表現。
- test file の細かな分割単位。

### 未回答の重要質問

- なし。

## 4. 影響範囲

### Impacted areas

1. **GitHub Actions**
   - manual bidirectional sync entry point
   - OAuth secrets / Drive root variable
   - PR automation
2. **Docs sync tooling**
   - target enumeration
   - OAuth token refresh
   - Drive REST API
   - Markdown import / export
   - folder mapping
   - conflict detection
3. **Tests**
   - pure path mapping
   - target scope guard
   - conflict decision table
   - new-file behavior
   - HTTP request contract
4. **Package scripts**
   - operator / workflow entry command
5. **対象 Markdown**
   - runtime の Google → Git 実行時だけ変更され得る。

### Files to inspect

実装時は少なくとも次を再確認する。

- `AGENTS.md`
- `PLANS.md`
- `package.json`
- `.github/workflows/ci.yml`
- `.github/workflows/expo-dependency-maintenance.yml`
- `scripts/docs/build-docs.ts`
- `scripts/spec/validate-all.ts`
- `scripts/validate-curriculum.ts`
- `.markdownlint-cli2.jsonc`
- `.prettierrc.json`
- `tsconfig*.json`
- `tests/unit/**/*.test.ts` の test convention
- `docs/spec/**/*.md`
- `docs/curriculum/**/*.md`

## 5. 変更方針

### Change strategy

#### 5.1 同期対象を最初に pure contract として固定する

同期ロジックより先に target path policy を実装する。

許可条件:

```text
^docs/spec/.+\.md$
^docs/curriculum/.+\.md$
```

ただし filesystem traversal では path separator を `/` に正規化してから判定する。

拒否例:

```text
README.md
docs/PROJECT_CONTEXT.md
docs/reference/foo.md
docs/plans/foo.md
docs/reports/foo.md
```

Workflow の changed-file allowlist でも同じ契約を再利用または同等に再検証し、script bug だけで対象外 file が PR に混ざらない defense-in-depth とする。

#### 5.2 Drive 上の path mapping を folder mirror で決定する

Google Drive 側を次のようにする。

```text
<GOOGLE_DOCS_SYNC_ROOT_FOLDER_ID>
├─ spec/
│  ├─ README.md              (Google Doc)
│  ├─ features/
│  │  ├─ cart.md             (Google Doc)
│  │  └─ ...
│  └─ ...
└─ curriculum/
   └─ test-automation/
      ├─ README.md            (Google Doc)
      ├─ part1/
      │  └─ ...
      └─ part2/
         └─ ...
```

Git path `docs/spec/features/cart.md` は Drive root から `spec/features/cart.md` に対応する。

この規則により、Google 側で新規 Doc を作る場合も「正しい folder に `.md` 名で作る」だけで Git path を導出できる。

#### 5.3 `appProperties` を canonical identity / sync state に使う

Git から作成した Doc、または Google → Git で初めて取り込んだ Doc には Drive file `appProperties` を付与する。

最低限の候補:

```text
qaTrainingStoreSync = "1"
githubPath = "docs/spec/features/cart.md"
lastGitSha256 = "..."
lastGoogleSha256 = "..."
```

用途:

- 同名 Doc の accidental duplicate 検出。
- folder-derived path と metadata path の不一致検出。
- 前回同期 state との比較。
- Repository 側へ Document ID mapping file を毎回 commit しない。

`documentId` は Drive API が返す ID を実行時に解決し、Repository の対象 Markdown 自体へ埋め込まない。

#### 5.4 Google API client は Node 標準 `fetch` + Drive REST で限定実装する

初期版では `googleapis` のような大きい dependency を追加せず、現在必要な endpoint だけを小さな Drive client に閉じ込める。

必要操作:

- OAuth token refresh
- Drive `files.list`
- Drive folder `files.create`
- Google Doc `files.create` + Markdown import
- Google Doc `files.update` + Markdown full replacement
- Google Doc `files.export?mimeType=text/markdown`
- Drive file metadata / `appProperties` update

HTTP request / response parsing は `drive-client.ts` に閉じ込め、sync core が URL や OAuth request details を知らない構造にする。

#### 5.5 認証情報は GitHub Secrets / Variables のみから注入する

Secrets:

```text
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REFRESH_TOKEN
```

Repository / Environment Variable:

```text
GOOGLE_DOCS_SYNC_ROOT_FOLDER_ID
```

原則:

- secret 値を log 出力しない。
- Access Token も log しない。
- HTTP error body に token が混ざらないよう summary 化する。
- missing env は API call 前に明示 error にする。
- workflow は fork PR では secret を使わない。

#### 5.6 Git → Google の同期アルゴリズム

対象 Markdown ごとに次を実施する。

1. Git file content を読み SHA-256 を計算する。
2. Drive folder mirror から対応 Doc を探す。
3. Doc がない場合:
   - 必要な folder を不足分だけ作る。
   - Markdown を Google Docs へ import して Doc を作る。
   - `githubPath` を設定する。
4. Doc がある場合:
   - Google export Markdown と metadata を取得する。
   - conflict decision を実施する。
   - safe の場合だけ Markdown full replacement を行う。
5. update / create 後に必ず再 export する。
6. 再 export 内容を round-trip check する。
7. 成功後に `lastGitSha256` / `lastGoogleSha256` を更新する。

Git → Google は Repository working tree を書き換えない。

#### 5.7 Google → Git の同期アルゴリズム

Drive root 配下を再帰走査し、Google Docs MIME type の file だけを見る。

対象判定:

1. Drive path を Git path に変換する。
2. `docs/spec/**/*.md` または `docs/curriculum/**/*.md` に一致するか検証する。
3. file title が `.md` で終わることを要求する。
4. `appProperties.githubPath` があれば folder-derived path と一致することを要求する。
5. 一致しない Doc は自動修正せず fail する。

対象 Doc ごとに:

1. `text/markdown` export。
2. LF / final newline と Repository formatting を決定的に normalize。
3. 対応 Git file がない場合は新規 file として作成。
4. Git file がある場合は conflict decision 後に overwrite。
5. 全件処理後、changed-file allowlist を検証。
6. Validator 実行。
7. diff なしなら no-op。
8. diff ありなら automation branch → commit → push → PR。

Google → Git では同期 state を「PR 作成時点で main と同期済み」に更新しない。
PR がまだ merge されていないためである。

次回 Git → Google 実行時に、current Git と current Google が同じ canonical content を表す場合は upload を行わず state だけ更新できるようにする。

#### 5.8 競合判定を pure decision table として実装する

最低限次を区別する。

| Git | Google | 判定 |
| --- | --- | --- |
| 両方前回 state と同じ | no-op | 何もしない |
| Git のみ変更 | Git → Google なら safe / Google → Git なら direction mismatch |
| Google のみ変更 | Google → Git なら safe / Git → Google なら direction mismatch |
| 両方変更 | conflict | 自動上書き禁止 |
| 現在 Git が current Google export の Repository-normalized 内容と等価 | synchronized | state refresh のみ |
| Git file のみ存在 | Git → Google で Google Doc create |
| Google Doc のみ存在 | Google → Git で Git file create |
| 両方存在・state metadata なし | initial bootstrap 以外は ambiguous | fail-safe |

初回 bootstrap は Git を source として Git → Google を先に実行し、既存 Git file 全件に state を作る。

#### 5.9 Markdown normalization は最小・明示的にする

Google export 後の自動補正を無制限に増やさない。

初期 normalize:

- CRLF → LF
- final newline を 1 つ付与
- Repository の Prettier 契約に従う formatting

relative link / image path / fenced code block / table の意味を独自 heuristics で書き換えない。

Google round-trip によって意味のある構造が変わる場合は、まず test case を固定し、必要な変換だけを明示的 adapter として追加する。

#### 5.10 初回は全対象ファイルを一括 bootstrap / round-trip 検証する

部分 PoC は行わず、current `main` の全対象 Markdown を Git → Google で一括作成する。

その直後に全 Doc を再 export し、対応 Git source と比較する。

確認対象:

- headings
- tables
- fenced code blocks
- inline code
- relative Markdown links
- relative image links
- HTML fragments がある場合の保持
- Unicode / 日本語
- BR / AC / SCREEN 等の識別子
- list / checkbox

差分は次に分ける。

1. formatting-only で Repository canonicalization に吸収可能
2. Google 側の表現変更だが既存 Validator / link contract を維持
3. semantic / structural drift

3 が 1 件でもある場合は初回同期を完了扱いにせず、その Markdown construct を test fixture 化して変換対策を行う。

#### 5.11 GitHub Actions Workflow

新規 `.github/workflows/google-docs-sync.yml` を追加する。

`workflow_dispatch` input:

```text
direction:
  - git-to-google
  - google-to-git
```

共通:

- manual 実行は `main` を対象とする。
- `actions/checkout` / `pnpm/action-setup` / `actions/setup-node` は Repository の既存 pin / version convention に合わせる。
- `pnpm install --frozen-lockfile`。
- OAuth env を secret から注入。
- concurrency group を固定し、双方向 sync の並列実行を防ぐ。

`git-to-google`:

- permissions は `contents: read` を基本とする。
- `pnpm run docs:google:push`。
- Repository commit / PR は作らない。

`google-to-git`:

- permissions:
  - `contents: write`
  - `pull-requests: write`
- open な `automation/google-docs-to-git-*` PR がある場合は新規 PR を作らず fail / no-op とする。
- `pnpm run docs:google:pull`。
- changed-file allowlist。
- targeted validation。
- `automation/google-docs-to-git-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}` を作る。
- bot identity で commit。
- `gh auth setup-git` + explicit branch push。
- `gh pr create --base main`。
- auto-merge はしない。

PR 本文には最低限以下を含める。

- Google Docs から自動同期したこと。
- 対象 scope が `docs/spec/**/*.md` / `docs/curriculum/**/*.md` のみであること。
- changed file 一覧。
- validation 結果。
- merge 後に Git → Google の state finalize を実行できること。

### 実行タスク

- [ ] 1. Repository mapping を実装時点の `main` で再確認し、既存 docs / workflow / test convention との差分がないか確認する。
- [ ] 2. 対象 path policy と Git path ↔ Drive path mapping の pure function を実装する。
- [ ] 3. path policy / mapping / traversal rejection の unit test を追加する。
- [ ] 4. OAuth Refresh Token → Access Token provider を実装する。
- [ ] 5. Drive REST client を実装し、list / folder create / doc create / doc update / markdown export / metadata update を分離する。
- [ ] 6. Drive client の request contract / error handling test を追加する。
- [ ] 7. SHA-256 based sync state と conflict decision table を実装する。
- [ ] 8. no-op / one-side change / both-side conflict / missing-side create / equivalent-content state refresh の unit test を追加する。
- [ ] 9. Git → Google orchestration を実装する。
- [ ] 10. Google → Git orchestration を実装する。
- [ ] 11. Google export → Repository Markdown normalizer を実装し、CRLF / final newline / formatting の test を追加する。
- [ ] 12. `package.json` に `docs:google:push` / `docs:google:pull` を追加する。
- [ ] 13. `.github/workflows/google-docs-sync.yml` を追加する。
- [ ] 14. Google → Git Workflow に target-only changed-file allowlist、duplicate open PR guard、validation、branch / commit / push / PR creation を実装する。
- [ ] 15. local / fake Drive test で Git 新規 file → Google Doc create を検証する。
- [ ] 16. local / fake Drive test で Google 新規 Doc → Git file create を検証する。
- [ ] 17. local / fake Drive test で target 外 path / Doc が変更されないことを検証する。
- [ ] 18. local / fake Drive test で deletion が Google / Git の相手側 delete を引き起こさないことを検証する。
- [ ] 19. GitHub Secrets / Variable を設定した manual run で current 全対象 Markdown の Git → Google bootstrap を実施する。
- [ ] 20. bootstrap 後に全 Doc を再 export し、全対象 Markdown の round-trip 差分を確認する。
- [ ] 21. semantic / structural drift があれば construct 単位の regression test を追加し、最小 adapter で解消する。
- [ ] 22. Google Doc を 1 件編集し、Google → Git が PR を作ることを実証する。
- [ ] 23. Git に対象 Markdown を 1 件新規追加し、Git → Google が対応 Doc を自動作成することを実証する。
- [ ] 24. Drive 側に mirrored folder rule で新規 Google Doc を 1 件追加し、Google → Git が新規 Markdown PR を作ることを実証する。
- [ ] 25. Git / Google の双方を前回同期後に変更し、workflow が conflict で停止して一方を上書きしないことを実証する。
- [ ] 26. targeted validation と `pnpm run verify` を実行し、最終差分を検証する。

## 6. 検証方法

### Validation plan

#### A. Pure / unit test

最低限次を Vitest で固定する。

- target path allow / deny
- Windows separator normalization
- `..` / root escape rejection
- Git path → Drive folder / Doc path
- Drive path → Git path
- metadata path mismatch rejection
- duplicate Doc rejection
- OAuth env missing
- token endpoint non-2xx
- Drive API non-2xx
- Markdown export content type / body handling
- Git-only create decision
- Google-only create decision
- one-side update
- both-side conflict
- equivalent-content state refresh
- no auto-delete

#### B. Repository validation

Google → Git runtime diff に対して:

```bash
pnpm exec prettier --write <changed markdown files only>
pnpm run lint:markdown
pnpm run validate:spec
pnpm run validate:curriculum
git diff --check HEAD
```

仕様 Markdown が変更された場合は必要に応じて:

```bash
pnpm run validate:spec-visuals:final
pnpm run build:spec
```

最終 implementation diff:

```bash
pnpm run verify
```

#### C. Initial full round-trip

1. current `main` の `docs/spec/**/*.md` / `docs/curriculum/**/*.md` を全件列挙。
2. Git → Google bootstrap。
3. Google Docs 全件を Markdown export。
4. Repository normalizer 適用。
5. source と export を比較。
6. existing validators 実行。
7. relative links / images が存在する path は file existence / link contract も確認。
8. semantic drift 0 件を完了条件とする。

#### D. GitHub Actions live scenarios

| Scenario | Expected |
| --- | --- |
| Git existing file edited | Git → Google で同じ Doc ID の内容を更新 |
| Git new target file | Google Doc を自動作成 |
| Google existing Doc edited | Google → Git で対象 file を変更した PR 作成 |
| Google new Doc in mirrored target folder | Git target file を新規作成した PR 作成 |
| Google Doc outside sync root | 完全に無視 |
| Google Doc under non-target folder | 完全に無視または明示 skip |
| both sides changed | conflict で fail、上書きなし |
| no changes | no-op、PR なし |
| existing open sync PR | duplicate PR を作らない |
| source side deletion | 相手側を自動削除しない |

### 成功判定

- 全 automated test PASS。
- current 全対象 Markdown の初回 bootstrap が完走。
- 全対象の re-export が validator を壊さない。
- semantic / structural round-trip drift 0 件。
- Google → Git の runtime changed-file allowlist 違反 0 件。
- Google → Git PR に対象外変更 0 件。
- conflict scenario で destructive overwrite 0 件。
- Git / Google 双方の new-file scenario が成功。
- `pnpm run verify` PASS。

## 7. リスクと未解決論点

### Risks

#### R1. Markdown round-trip drift

最重要リスク。

現在の対象 Markdown は画像・相対リンク・表・code block を含むため、Google import/export が Markdown source を完全には保持しない可能性がある。

対策:

- current 全対象を初回から一括 round-trip。
- semantic drift を fail 扱い。
- general-purpose heuristic converter を作らず、実際に壊れた construct だけ regression test + adapter で扱う。

#### R2. OAuth credential blast radius

Google 側手動新規 Doc の discovery / edit まで行うため full Drive scope を使う前提になる。

対策:

- GitHub Secrets 以外へ credential を保存しない。
- workflow / script log へ token を出さない。
- code 上の Drive 操作を configured root 配下へ限定する。
- 可能なら同期専用 Google Account / Drive 領域を利用する。

#### R3. Google-side manual folder / filename mistake

Google 新規 Doc を間違った folder に置くと誤 path へ同期される可能性がある。

対策:

- target prefix allowlist。
- `.md` filename 必須。
- folder-derived path と `appProperties.githubPath` の不一致は fail。
- root 外は無視。

#### R4. 双方向同時編集

両側更新でデータを失うリスク。

対策:

- direction 明示。
- concurrent workflow を concurrency で禁止。
- hash state で both-side changed を fail。
- modifiedTime の newer-wins は使わない。

#### R5. Google → Git PR pending 中の追加 Google edit

PR 作成後に Google がさらに変更されると PR 内容が最新でなくなる。

対策:

- open sync PR の重複生成を禁止。
- merge 後の Git → Google 時に current contents が equivalent か確認する。
- equivalent でなければ Google を Git で上書きせず conflict とする。
- 必要なら stale PR を閉じて Google → Git を再実行する運用とする。

#### R6. 削除の再生成

自動削除を実装しないため、片側だけ削除した状態で逆方向同期すると新規作成として復活し得る。

対策:

- 初期版では「同期済み対象の削除はサポート外」と明記する。
- delete / rename は別の明示 Workflow を設計するまで自動化しない。

### Open questions

- Blocking な open question はなし。
- Round-trip drift の具体的内容だけは live Google API 実行で確定する。これは設計質問ではなく implementation validation task として扱う。

## 8. 成果物

### 変更ファイル候補

新規:

```text
.github/workflows/google-docs-sync.yml
scripts/docs/google-docs-sync/cli.ts
scripts/docs/google-docs-sync/config.ts
scripts/docs/google-docs-sync/drive-client.ts
scripts/docs/google-docs-sync/path-mapping.ts
scripts/docs/google-docs-sync/sync-core.ts
scripts/docs/google-docs-sync/markdown-normalizer.ts
tests/unit/google-docs-sync-path-mapping.test.ts
tests/unit/google-docs-sync-core.test.ts
tests/unit/google-docs-sync-drive-client.test.ts
```

更新候補:

```text
package.json
pnpm-lock.yaml   # dependencyを追加する場合のみ。初期方針では追加dependencyなしのため変更不要想定。
```

runtime で Google → Git が変更してよい content:

```text
docs/spec/**/*.md
docs/curriculum/**/*.md
```

### 付随ドキュメント

- この Plan を implementation の正本とする。
- plan-only のため `docs/reports/` には新規 report を作らない。
- OAuth Client / Refresh Token / root folder の実値は Repository に保存しない。

## 9. 備考

### Branch

```text
feat/google-docs-markdown-sync
```

### Base

Plan 作成時点の `main`:

```text
856a14eb448a6ad6bf9722f623cf0d094b7a7d2a
```

### 実装時の優先順位

1. **対象 scope の強制**
2. **data loss を防ぐ conflict detection**
3. **全ファイル round-trip の成立**
4. **新規追加の双方向自動生成**
5. **PR automation**
6. **運用上の利便性**

変換補正や認証抽象化を先に一般化しない。実際に current 全対象 Markdown で必要になったものだけ追加する。
