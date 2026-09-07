# Google Docs / Markdown 双方向同期 実装計画

## 0. 依頼概要

- 依頼内容:
  - `docs/spec/**/*.md` と `docs/curriculum/**/*.md` のみを同期対象とする。
  - 1 Markdown = 1 Google Doc とし、Google Docs のタブ分割は使わない。
  - GitHub Actions から OAuth 2.0 Client ID / Client Secret / Refresh Token を使って Google Drive API を呼び出す。
  - Git → Google Docs、Google Docs → Git の双方向同期を可能にする。
  - 対応先が存在しない場合は新規作成する。
  - Google Docs → Git は GitHub 上へ直接反映せず、都度 automation branch と Pull Request を作成する。
- 背景:
  - 仕様書とテスト自動化カリキュラムを、人間が編集しやすい Google Docs と、検証・履歴管理に強い Git の両方で維持したい。
  - 現在の Repository は `docs/spec/**` と `docs/curriculum/**` に Markdown を細かく分割しており、既存 validator もその Markdown を正本として検証している。
- 期待成果:
  - 対象 Markdown 全件を Google Docs と 1:1 で対応させ、追加・更新を安全に往復できる同期基盤。
  - 双方が同時変更された場合に片方を黙って上書きしない競合検知。
  - Google Docs 由来の変更を既存 validator で検証してから PR 化する安全な運用。

## 1. ゴール / 完了条件

### ゴール

`docs/spec/**/*.md` と `docs/curriculum/**/*.md` だけを対象に、GitHub Actions から Google Drive API を用いて Google Docs と Markdown を双方向同期できる状態にする。

### 完了条件（DoD）

- 同期対象は次の 2 glob のみに hard-bound されている。
  - `docs/spec/**/*.md`
  - `docs/curriculum/**/*.md`
- 上記以外の Markdown を同期対象として列挙・作成・更新・削除しない。
- Google Drive 側では、指定された同期 root folder 配下に Git の `docs/` 以下の階層を mirror する。
  - `<SYNC_ROOT>/spec/.../<filename>.md`
  - `<SYNC_ROOT>/curriculum/.../<filename>.md`
- Google Doc 名は Git の filename と完全一致させ、`.md` 拡張子も保持する。
- Git → Google Docs:
  - 既存 Doc があれば同じ `fileId` を維持して内容を全面更新する。
  - 対応 Doc がなければ必要な Drive folder と Google Doc を自動作成する。
  - Git 側の新規 Markdown 追加は次回同期で自動的に Google Doc 化される。
- Google Docs → Git:
  - 対応 Git file があれば内容を更新する。
  - 同期 root 配下に新規 Google Doc があり、folder hierarchy + filename から対象 glob 内の path を一意に導出できる場合は Git file を新規作成する。
  - 変更がある場合だけ automation branch を作り、validator 成功後に PR を作成する。
  - main へ直接 commit / push しない。
- 自動削除は実装しない。
  - Git 側に file がないことを理由に Google Doc を削除しない。
  - Google 側に Doc がないことを理由に Git file を削除しない。
- 自動 rename / move は実装しない。
  - path identity が食い違う場合は競合として停止し、別 path の新規 file として黙って処理しない。
- 双方に未同期変更がある場合は fail し、どちらも上書きしない。
- 初回は対象 Markdown 全件を Git → Google Docs で同期し、直後に全 Doc を Markdown export して round-trip compatibility を確認する。
- Round-trip 後の canonical Markdown が Git 側 canonical Markdown と一致するか、差分がある場合でも既存仕様・リンク・画像参照・コードブロック・表を破壊しないことを確認できる。
- Google Docs → Git で生じる変更は少なくとも次を通過する。
  - `pnpm run lint:markdown`
  - `pnpm run validate:spec`
  - `pnpm run validate:spec-visuals:final`
  - `pnpm run validate:curriculum`
  - `pnpm run build:spec`
- 最終的に `pnpm run verify` が PASS する。
- OAuth credential、refresh token、access token を repository / log / PR body / artifact に保存しない。

## 2. 現状理解と前提

### Current understanding

- Repository の仕様書は `docs/spec/` に分割され、feature spec、screen catalog、roles、state、visual reference など複数 Markdown を持つ。
- カリキュラムは `docs/curriculum/test-automation/` 以下で基礎文書、Part 1、Part 2 の lesson 単位に分割されている。
- `package.json` には `lint:markdown`、`validate:spec`、`validate:spec-visuals:final`、`validate:curriculum`、`build:spec`、`verify` が存在する。
- `scripts/docs/` には現時点で Google Docs 同期実装はなく、既存の docs script は `build-docs.ts` が中心である。
- GitHub Actions には automation branch を作成し `gh pr create` する既存例があり、`persist-credentials: false`、`contents: write`、`pull-requests: write` を使う流儀がある。
- Google Drive API は Google Docs を `text/markdown` として export できる。
- Google OAuth 2.0 は `access_type=offline` で得た Refresh Token から、GitHub Actions のような unattended execution でも Access Token を更新できる。
- Drive file の `appProperties` に integration-private な key-value metadata を保持できる。
- 任意に Google Drive UI から手動作成された Doc を自動検出・編集対象に含めるには、`drive.file` の per-file access だけでは不十分である。今回の「Google 側でも新規 Doc を追加し Git file を作れる」要件を満たす初期案では OAuth scope `https://www.googleapis.com/auth/drive` を使用し、コード側で同期 root folder と target path を厳密に制限する。

### Assumptions

- 同期 root は Google Drive 上に 1 つ用意し、その folder ID を GitHub Actions configuration から与える。
- 初回 bootstrap 時点では Git の対象 Markdown を初期 source とする。
- Google Docs 上で新規文書を作る場合は、同期 root 配下の対応 folder に `.md` を含む正しい filename で作成する。
- Markdown の repository canonical form は LF + final newline + Repository の Prettier 設定を通した結果とする。
- Google の import / export が作る harmless formatting 差分は canonicalization で吸収する。ただし repository 固有の相対リンク、相対画像、表、code fence、見出し等を意味的に変更する補正は行わない。
- Network/API client は Node.js 組み込み `fetch` を基本とし、Google SDK dependency は必要性が出ない限り追加しない。

### Non-goals

- `docs/spec/**/*.md` と `docs/curriculum/**/*.md` 以外の Markdown 同期。
- `docs/reports/**`、`docs/plans/**`、`docs/reference/**`、root Markdown、Run Artifact 等の Google Docs 化。
- Google Docs のタブ機能を使った 1 Doc 複数 Markdown 管理。
- Google Docs / Git の自動削除伝播。
- rename / move の自動伝播。
- Google Drive 全体を一般用途のファイル同期ツールとして扱うこと。
- Google Docs のコメント、提案モード、revision history を Git へ同期すること。
- Git 側の画像 asset 自体を Google Drive へ同期すること。
- 定期 cron polling。初期実装の Google → Git は manual `workflow_dispatch` とする。
- OAuth Consent Screen や Google Cloud project 自体を GitHub Actions から自動構築すること。

## 3. 質問 / 曖昧性

### 必ず質問する不透明点

- なし。現時点の要件で実装方針を固定できる。

### 仮定してよい細部

- Drive 上の同期 root 名は任意とし、ID だけを契約にする。
- Google Doc の表示名は Git filename をそのまま使う。
- Google → Git の automation branch prefix は `automation/google-docs-sync-` とする。
- PR title/body は既存 automation PR の流儀に合わせ、日本語で同期方向・変更件数・validation を明記する。

### 未回答の重要質問

- なし。

## 4. Repo mapping / 影響範囲

### Entry points

- GitHub Actions:
  - 新規 `.github/workflows/google-docs-sync.yml`
- CLI / orchestration:
  - 新規 `scripts/docs/google-docs-sync.ts`
- Google Drive HTTP boundary:
  - 新規 `scripts/docs/google-drive-client.ts`
- pure sync logic:
  - 新規 `scripts/docs/google-docs-sync-core.ts`
- Repository scripts:
  - `package.json`

### Main flow

#### Git → Google Docs

1. `main` を checkout する。
2. 対象 glob の Markdown を再帰列挙する。
3. OAuth Refresh Token から Access Token を取得する。
4. 同期 root folder 以下の Drive tree を読み込む。
5. Git path と Drive folder + Doc name を照合する。
6. 対応 Doc がなければ folder / Doc を作成する。
7. 競合判定を行う。
8. safe なものだけ Markdown を Google Doc へ import/update する。
9. 更新後に Google Doc を Markdown export し canonicalize する。
10. sync metadata を `appProperties` に保存する。
11. 全件の結果を summary として Actions log に出す。secret は出さない。

#### Google Docs → Git

1. `main` を checkout する。
2. OAuth Refresh Token から Access Token を取得する。
3. 同期 root folder 以下だけを再帰走査する。
4. `spec/**` / `curriculum/**` 配下の Google Docs だけを候補にする。
5. folder path + `.md` filename から Git path を導出する。
6. `appProperties.githubPath` がある場合は導出 path と一致することを確認する。
7. 競合判定を行う。
8. safe な Doc を `text/markdown` export し canonicalize する。
9. Git file がなければ作成、あれば更新する。
10. no-op なら終了する。
11. diff がある場合は changed-file allowlist を検査する。
12. existing validator を実行する。
13. automation branch を作成し、対象 Markdown だけを commit / push する。
14. PR を作成する。auto-merge はしない。

### Key abstractions

- `TargetPathPolicy`
  - 対象 glob 判定、path normalization、path traversal rejection を担当する pure logic。
- `DriveTreeIndex`
  - root folder 配下だけを folder/doc path に index する。
- `DocumentIdentity`
  - Git path、Drive fileId、Drive-derived path、`appProperties.githubPath` を対応付ける。
- `MarkdownCanonicalizer`
  - LF、final newline、Prettier-compatible canonical form を扱う。
- `SyncFingerprint`
  - SHA-256 により前回同期 baseline と現在の Git / Google canonical content を比較する。
- `ConflictDecision`
  - `no-op` / `git-only-changed` / `google-only-changed` / `converged` / `conflict` を pure function で判定する。
- `GoogleDriveClient`
  - OAuth token refresh、files.list/create/update/export、folder create、appProperties update の side-effect boundary。

### Existing tests / validation

- `tests/unit/**` は Vitest による pure / boundary logic の test 配置として利用できる。
- `pnpm run lint:markdown`
- `pnpm run validate:spec`
- `pnpm run validate:spec-visuals:final`
- `pnpm run validate:curriculum`
- `pnpm run build:spec`
- `pnpm run verify`
- `git diff --check`

### Safe change surface

- `.github/workflows/google-docs-sync.yml`
- `scripts/docs/google-*.ts`
- 同期ロジック用 unit tests
- `package.json` scripts
- 運用手順用 `docs/reference/google-docs-sync.md`
- 必要な ADR / Project Context 更新

### Unknowns

- Google Docs の Markdown import → export が、現 Repository に存在する相対画像 Markdown、複雑な table、code fence、HTML fragment 等をどの程度完全に round-trip するかは、実データ全件で確認が必要。
- この Unknown は scope を縮小する理由にはせず、初回 bootstrap で全対象 file を実際に import/export して検出する。

### Impacted areas

- Google OAuth credential handling
- Google Drive API integration
- Markdown canonicalization
- GitHub Actions automation PR
- Existing spec / curriculum validators
- Repository documentation / ADR

### Files to inspect during implementation

- `AGENTS.md`
- `PLANS.md`
- `package.json`
- `.github/workflows/ci.yml`
- `.github/workflows/expo-dependency-maintenance.yml`
- `scripts/docs/build-docs.ts`
- `scripts/spec/validate-all.ts`
- `scripts/validate-curriculum.ts`
- `.prettierrc.json`
- `.prettierignore`
- `.markdownlint-cli2.jsonc`
- `docs/spec/**/*.md`
- `docs/curriculum/**/*.md`

## 5. 変更方針

### Change strategy

実装は「path/競合判定の pure logic → Google API boundary → CLI → workflow → full bootstrap validation」の順に進める。先に side effect を作らず、上書き可否を deterministic に判定できる部分を固めてから実 API と GitHub write を接続する。

### 5.1 対象 path 契約を固定する

- canonical target root を `docs/spec` と `docs/curriculum` の 2 つだけにする。
- glob expansion 後も real repository-relative path を再検証する。
- `..`、absolute path、symlink 経由で対象外へ出る path、空 path を reject する。
- Google Drive 側は configured root folder 配下だけを再帰走査する。
- root 直下は `spec` と `curriculum` だけを同期 namespace として認識する。
- Google Docs 名は `.md` を含む exact filename とする。
- Google-side derived Git path が target policy を通らない場合は ignore ではなく managed namespace 内の invalid item として fail し、誤同期を可視化する。

### 5.2 Drive folder / Doc identity を実装する

- configured root folder ID は secret ではないため GitHub Actions Variable を基本候補とする。
- root 以下の folder hierarchy を Git の `docs/` 以下と mirror する。
- Git → Google で folder が不足していれば再帰作成する。
- created / adopted Doc へ次の `appProperties` を付与する。
  - `qaTrainingStoreSyncVersion=1`
  - `githubPath=<repository-relative-path>`
  - `lastSyncedGitSha256=<sha256>`
  - `lastSyncedGoogleSha256=<sha256>`
- `fileId` 自体を repository mapping file に固定保存せず、Drive hierarchy + appProperties から毎回 index できる構造にする。
- 同一 effective Git path に複数 Doc が存在する場合は fail する。
- `appProperties.githubPath` と Drive folder/title から導出した path が食い違う場合は rename/move ambiguity として fail する。

### 5.3 OAuth / Drive client を実装する

- GitHub Secrets:
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_OAUTH_CLIENT_SECRET`
  - `GOOGLE_OAUTH_REFRESH_TOKEN`
- GitHub Variable:
  - `GOOGLE_DOCS_SYNC_ROOT_FOLDER_ID`
- Refresh Token から token endpoint で短命 Access Token を取得する。
- Access Token は process memory のみに置き、file へ保存しない。
- log へ Authorization header、token response、client secret を出さない。
- Drive API 操作を明示的な small methods に限定する。
  - list children
  - create folder
  - create Google Doc from Markdown
  - update Google Doc content from Markdown
  - export Google Doc as Markdown
  - update appProperties
- retry は 429 / bounded 5xx の idempotent read に限定して小さく実装する。write retry は duplicate create を避ける idempotency 判定なしに無制限実施しない。
- OAuth scope は、Google Drive UI で手動作成した Doc まで自動発見し bidirectional create を成立させるため `https://www.googleapis.com/auth/drive` を採用する。
- broad OAuth scope であっても application-side capability は configured sync root + target path policy に制限する。

### 5.4 Markdown canonicalization を実装する

- UTF-8 text として扱う。
- CRLF / CR を LF へ正規化する。
- final newline を 1 つ保証する。
- Repository の Prettier 設定を canonical comparison に利用できる helper を用意する。
- Google export 固有の harmless formatting 差分のみ deterministic に吸収する。
- 相対 URL、image path、code text、table cell text、heading text、BR/AC identifier 等を独自に意味変換しない。
- canonicalization の前後で repository 固有 token が欠落しないことを targeted test で確認する。

### 5.5 競合判定を実装する

各 Doc の `appProperties` に前回同期時の Git / Google canonical SHA-256 を別々に保存する。

現在値:

- `currentGitSha`
- `currentGoogleSha`
- `baselineGitSha`
- `baselineGoogleSha`

判定:

- baseline なし + Git のみ存在:
  - Git → Google bootstrap/create を許可する。
- baseline なし + Google のみ存在:
  - Google → Git create を許可する。
- Git unchanged / Google unchanged:
  - no-op。
- Git changed / Google unchanged:
  - Git → Google のみ許可。
  - Google → Git 実行時は Git 側に未同期変更があるため上書きせず停止する。
- Git unchanged / Google changed:
  - Google → Git のみ許可。
  - Git → Google 実行時は Google 側に未同期変更があるため上書きせず停止する。
- Git changed / Google changed:
  - canonical current content が一致していれば `converged` とし baseline のみ更新できる。
  - 一致しなければ conflict として fail し、どちらも上書きしない。
- missing side:
  - delete と解釈しない。
  - opposite side を削除しない。
  - direction に応じて「新規作成」と「既存 managed identity 消失」を区別し、既存 baseline がある managed item の消失は警告または fail とする。

### 5.6 Git → Google Docs CLI を実装する

- command 例:
  - `pnpm run sync:google-docs:push`
- dry-run mode を用意する。
- 全 target Markdown を毎回列挙し、incremental optimization を correctness requirement にしない。
- missing folder / Doc を作成する。
- safe decision の file だけ update/create する。
- update/create 後に必ず再 export し canonical SHA を取得する。
- round-trip canonical content が source Git canonical content と一致しない file は一覧化する。
- destructive round-trip mismatch が検出された場合、baseline を確定せず fail する。
- 成功した Doc の appProperties baseline を更新する。

### 5.7 Google Docs → Git CLI を実装する

- command 例:
  - `pnpm run sync:google-docs:pull`
- dry-run mode を用意する。
- root folder 配下を再帰走査し、target namespace の Google Docs だけを対象にする。
- appProperties がない手動新規 Doc は folder hierarchy + exact `.md` filename から path を導出する。
- valid な新規 Doc は `githubPath` を adopt できるが、sync baseline は PR merge 前に確定しない。
- export Markdown を canonicalize し Git worktree に create/update する。
- no-op 時は Git mutation しない。
- script 自身は branch / commit / PR を作らず、filesystem mutation と sync decision に限定する。

### 5.8 GitHub Actions workflow を実装する

#### Manual Google → Git

- trigger: `workflow_dispatch`
- main ref 以外からの manual execution は reject する。
- permissions:
  - `contents: write`
  - `pull-requests: write`
- `actions/checkout` は `persist-credentials: false`。
- dependencies install 後に pull CLI を実行する。
- changed-file allowlist:
  - `docs/spec/**/*.md`
  - `docs/curriculum/**/*.md`
  - 上記以外の変更があれば PR 作成前に fail。
- validation を実行する。
- no diff は success/no-op。
- diff があれば `automation/google-docs-sync-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}` を作成する。
- bot identity で対象 Markdown のみ commit する。
- explicit refspec で push する。
- `gh pr create` で main 向け PR を作る。
- open sync PR がすでに存在する場合は重複 PR を作らず fail-safe に終了または明示 fail する。
- PR body に direction、対象件数、created/updated 件数、validation 結果、conflict=0 を記載する。
- auto-merge はしない。

#### Git → Google

- trigger:
  - `workflow_dispatch`
  - `push` to `main` with paths:
    - `docs/spec/**/*.md`
    - `docs/curriculum/**/*.md`
- Git 変更が PR merge 後 main に入った時点で Google Docs を同期する。
- Google 側 conflict がある場合は上書きせず workflow fail。
- GitHub repository write permission は不要とし、Google API read/write だけを行う。

### 5.9 初回 full bootstrap / round-trip validation を行う

- 対象 Markdown を全件列挙する。
- `git-to-google` を全件実行する。
- missing Drive folders / Docs を全件作成する。
- 各 Doc を直後に Markdown export する。
- source Git canonical Markdown と export canonical Markdown を全件比較する。
- mismatch を file path 単位で収集する。
- mismatch がある場合:
  - 相対 link / image link
  - table
  - code fence
  - heading
  - list
  - inline code / emphasis
  - HTML fragment
  のどこが変わったか確認する。
- repository-specific structure が失われる差分を normalization だけで隠さない。
- converter/canonicalizer を修正後、全件 round-trip を再実施する。
- 全対象 file が安全に round-trip できるまで Google → Git の production write path を完了扱いにしない。

### 5.10 Google → Git の PR merge 後 convergence を扱う

- Google 変更由来 PR が main へ merge されると Git → Google workflow が発火する。
- この時、baseline 上は Git/Google 双方 changed に見える可能性がある。
- current Git canonical と current Google canonical が一致する場合は conflict にせず `converged` と判定する。
- content upload は不要で、appProperties baseline のみ更新する。
- PR が merge されず close された場合は baseline を更新しないため、Google 側変更は次回 pull でも再検出される。

### 5.11 運用文書と ADR を追加する

- `docs/reference/google-docs-sync.md`
  - Google Cloud project / Drive API enable
  - OAuth consent / client creation
  - offline Refresh Token 取得
  - GitHub Secrets / Variable 設定
  - sync root folder 構造
  - Google 側で新規 Doc を追加する手順
  - Git 側で新規 Markdown を追加した場合の動作
  - push / pull workflow 実行方法
  - conflict 解消方法
  - deletion / rename 非対応
- 重要な外部同期・restricted OAuth scope・no-delete / conflict policy は ADR として記録する。
- `docs/PROJECT_CONTEXT.md` には Google Docs sync capability の存在と入口だけを追記する。

### 実行タスク

- [ ] 1. 対象 glob と Drive path mapping の pure policy を実装する。
- [ ] 2. Markdown canonicalizer と SHA-256 fingerprint を実装する。
- [ ] 3. ConflictDecision を pure function として実装し、全状態組合せを unit test する。
- [ ] 4. OAuth Refresh Token / Google Drive API client を実装する。
- [ ] 5. Drive tree indexing、folder create、Doc create/update/export、appProperties 管理を実装する。
- [ ] 6. Git → Google Docs CLI と dry-run を実装する。
- [ ] 7. Google Docs → Git CLI と dry-run を実装する。
- [ ] 8. package scripts を追加する。
- [ ] 9. Google → Git PR workflow を実装する。
- [ ] 10. main push / manual Git → Google workflow を実装する。
- [ ] 11. changed-file allowlist と duplicate PR guard を実装する。
- [ ] 12. OAuth / Drive client を mock した unit / integration-style test を追加する。
- [ ] 13. 初回全対象 Markdown の Git → Google bootstrap を実施する。
- [ ] 14. 全対象 Doc の round-trip export comparison を実施し、必要な canonicalization 修正を行う。
- [ ] 15. Google Doc 1件更新 → Git PR 作成を実環境で確認する。
- [ ] 16. Git に新規 Markdown 1件追加 → Google Doc 自動作成を実環境で確認する。
- [ ] 17. Google Drive に新規 `.md` Doc 1件追加 → Git file 新規作成 PR を実環境で確認する。
- [ ] 18. 双方同時変更で conflict fail し、上書きされないことを確認する。
- [ ] 19. 片側 missing で自動削除されないことを確認する。
- [ ] 20. ADR / reference / PROJECT_CONTEXT を更新する。
- [ ] 21. targeted validation と `pnpm run verify` を実行する。
- [ ] 22. credential / token / absolute path が tracked artifact や log summary に残っていないことを確認する。

## 6. 検証方法

### Validation plan

#### Pure logic tests

- target path allow / deny:
  - `docs/spec/a.md` → allow
  - `docs/spec/sub/a.md` → allow
  - `docs/curriculum/a.md` → allow
  - `docs/curriculum/sub/a.md` → allow
  - `docs/reference/a.md` → deny
  - `README.md` → deny
  - traversal / absolute path → deny
- Drive path derivation:
  - root/spec/features/cart.md → `docs/spec/features/cart.md`
  - root/curriculum/test-automation/part1/x.md → expected path
- duplicate effective path → fail
- appProperties path mismatch → fail
- rename/move ambiguity → fail
- no-delete policy → opposite side is not deleted

#### Conflict matrix tests

- neither changed → no-op
- Git only changed → push allowed
- Google only changed → pull allowed
- both changed, canonical equal → converged
- both changed, canonical different → conflict
- baseline absent + Git only → create Doc
- baseline absent + Google only → create Git file
- baseline known + one side missing → deletion not inferred

#### Markdown tests

Actual repository content patternsを fixture に含める。

- Markdown table
- fenced TypeScript / bash / YAML code
- relative Markdown link
- relative image path
- heading hierarchy
- Japanese + English mixed identifiers
- inline code
- blockquote / list
- HTML fragment が存在する場合はその実例

#### Google API boundary tests

HTTP を mock して次を確認する。

- Refresh Token exchange success / failure
- 401 / 403 を credential leak なしで error 化
- Drive list pagination
- folder create
- Doc create
- existing Doc update
- Markdown export
- appProperties update
- 429 / bounded 5xx handling
- duplicate create を起こさない write failure handling

#### Workflow static / behavior validation

- manual pull は main ref 以外を reject。
- changed-file allowlist が target glob 以外を拒否。
- no-op では branch / PR を作らない。
- diff 時だけ branch / commit / push / PR。
- `persist-credentials: false`。
- secret は `env` から process へ渡し、echo しない。

#### Real Google Drive acceptance

1. Initial full bootstrap:
   - 対象 Markdown 全件について Doc が作成/更新される。
   - Drive folder hierarchy が Git path と一致する。
2. Full round-trip:
   - 全 Doc export を canonical compare。
   - destructive mismatch 0。
3. Google update:
   - 既存 Doc を編集。
   - pull workflow で target Markdown だけの PR が作成される。
4. Git new file:
   - target path に新規 `.md` を追加して main へ merge。
   - corresponding Google Doc が自動作成される。
5. Google new Doc:
   - sync root の valid folder に `new-file.md` を作る。
   - pull workflow で corresponding Git file の PR が作成される。
6. Conflict:
   - 前回同期後、Git/Google 両方を別内容へ変更。
   - workflow は fail し、双方の content を変更しない。
7. Missing side:
   - 片側を一時的に missing にする。
   - opposite side が自動削除されない。

#### Repository validation

- targeted Vitest
- `pnpm run format:check`
- `pnpm run lint:markdown`
- `pnpm run validate:spec`
- `pnpm run validate:spec-visuals:final`
- `pnpm run validate:curriculum`
- `pnpm run build:spec`
- `git diff --check`
- `pnpm run verify`

### 成功判定

- sync target 外の file mutation 0。
- target file 全件の initial Doc mapping 完了。
- destructive round-trip mismatch 0。
- Google → Git の変更は validation PASS 後 PR 化される。
- Git → Google の新規 file は Doc 自動作成される。
- Google → Git の新規 valid Doc は Git file 自動作成 PR になる。
- simultaneous edit で silent overwrite 0。
- automatic deletion 0。
- credential exposure 0。

## 7. リスクと未解決論点

### Risks

1. **Google Docs Markdown round-trip の非同値**
   - 最大の技術リスク。
   - 既存 spec は相対画像・表・リンクを多用するため、単純な import/export が exact でない可能性がある。
   - 対策: 初回から全 target file を round-trip し、canonical diff を全件 gate にする。

2. **Restricted OAuth scope**
   - Google Drive UI で手動作成した任意 Doc を自動発見・更新する要件のため `drive` scope を使う。
   - Repository code は root folder と path allowlist で権限行使を絞るが、OAuth token 自体の capability は広い。
   - 対策: dedicated OAuth client、least number of test users、GitHub Secret 管理、ログ redaction、公開アプリ化しない前提の運用文書化。

3. **双方向同時変更**
   - last-writer-wins は採用しない。
   - 対策: per-Doc baseline fingerprint と converged 判定。

4. **PR merge 前 baseline 更新**
   - Google → Git pull 時点で baseline を確定すると、PR close 時に状態が壊れる。
   - 対策: PR 作成時は baseline 未確定。merge 後 main push の Git → Google で canonical equality を見て convergence 確定。

5. **Drive duplicate name / folder**
   - Drive は同名 item を許容するため path mapping が曖昧になり得る。
   - 対策: same parent + same effective filename の duplicate は fail。

6. **rename / move**
   - 自動 delete をしないため、rename を create+delete と扱うと orphan が残る。
   - 対策: initial scope では auto rename/move 非対応とし、identity/path mismatch を fail。

7. **Actions credential exposure**
   - shell trace や thrown HTTP body から secret が漏れる可能性。
   - 対策: token response を log しない、Authorization header を error object へ含めない、GitHub mask に依存し過ぎない。

### Open questions

- blocking open question はなし。
- full round-trip 実測で Google export 固有差分が判明した場合のみ、canonicalizer の許容変換範囲を実 Evidence に基づき追加する。事前に広い独自 Markdown converter は作らない。

## 8. 成果物

### 予定変更ファイル

- `.github/workflows/google-docs-sync.yml`
- `scripts/docs/google-docs-sync.ts`
- `scripts/docs/google-docs-sync-core.ts`
- `scripts/docs/google-drive-client.ts`
- `tests/unit/google-docs-sync.test.ts`
- 必要に応じて `tests/unit/google-drive-client.test.ts`
- `package.json`
- `docs/reference/google-docs-sync.md`
- `docs/adr/<next>-google-docs-markdown-sync.md`
- `docs/PROJECT_CONTEXT.md`

### 同期によってのみ変更可能な content files

- `docs/spec/**/*.md`
- `docs/curriculum/**/*.md`

### 付随ドキュメント

- OAuth / GitHub Secrets 設定手順
- Drive folder / file naming rule
- conflict 解消手順
- new file / new Doc の追加手順
- deletion / rename 非対応の明記

## 9. 備考

- 実装はこの Plan を正本として同一 branch `feat/google-docs-markdown-sync` で継続する。
- 初回の全件同期は「小規模 PoC」ではなく、対象 2 glob 全件を対象とした bootstrap + round-trip validation とする。
- Google Docs → Git は PR review を必須の safety boundary とし、Google の編集内容を main へ直接流さない。
- Git → Google は main に merge 済みの対象 Markdown 変更を自動同期してよいが、Google 側未同期変更があれば workflow を fail させる。
- 削除・rename/move を自動化しないことで、missing state を誤って破壊操作へ変換しない。
