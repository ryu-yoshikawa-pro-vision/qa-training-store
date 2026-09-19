# Report（追記のみ）

## 2026-09-19 05:15 (JST)

- Summary: Issue #163 Planの最終レビュー指摘を反映し、実装前の未決定事項を解消した。
- Changes:
  - dependency pathの正本を独自lockfile解析から固定pnpmの`pnpm list --json --depth Infinity`へ変更。
  - PR #58型の同一target dependencyに対する複数parent-scoped overrideを許可し、global overrideは初期実装で禁止。
  - direct / root parent dependencyのspecifier形式をexact / `^` / `~`の維持に限定。
  - root parentの公開version候補をworkflow側の`pnpm view`から構造化してOpenCodeへ渡す契約を追加。
  - Renovateの`prConcurrentLimit`を`1`へ固定し、PR body / branch / commit / PR titleの公開templateを具体化。
  - OpenCode V1 permissionのlast-match仕様に合わせ、read / edit rule順序とactivation fixtureを固定。
  - open PRとの重複判定をchanged files / patchベースで具体化。
- Validation:
  - 固定pnpm `v9.10.0`の`list()` / `listForPackages()`経路を確認。
  - PR #58で2 selectorのparent-scoped overrideが実際に必要だったことを確認。
  - OpenCode `v1.18.31`のpermissionが最後に一致したruleを採用することを確認。
  - Renovate現行docsで`vulnerabilityAlerts`、`prBodyTemplate`、`prBodyColumns`、`branchTopic`、commit message設定を確認。
- Scope: 実装ファイル、外部App、Repository Settings、Secret、PR metadataは変更していない。
- Progress: 100% (4/4)


## 2026-09-19 09:00 (JST)

- 概要: 直近の修正以降に出たレビュー結果を統合し、妥当と判断した必須対応8件・明確化2件をPlanへ反映した。
- 変更:
  - GitHub形式のnpm vulnerable rangeを

## 2026-09-19 09:05 (JST)

- 最終確認でworkflow方針本文に旧`security-dependency-fallback-${{ inputs.alert_number }}`が1箇所残っていたため、固定`security-dependency-fallback`へ修正した。
- DoD、workflow方針、contract testのconcurrency契約が一致したことを再確認する。

## 2026-09-19 12:21 (JST)

- 概要: これまでのレビュー結果を再統合し、旧Planに残っていた目的逸脱、成立しない検証経路、Security境界の不足を修正した。
- 重要な変更:
  - workflowが全parent versionをcandidateごとにinstallして`verified_parent_fix`を決める設計を撤回した。
  - root parent candidateは同一major・最大10件までの公開候補としてOpenCodeへ渡し、OpenCodeが1回だけ選択した修正を後段validatorで検証する。
  - `pnpm install --lockfile-only`直後の`pnpm list`でcandidateを検証する旧経路を削除した。
  - raw Dependabot Alertを扱う`read-alert`と、dependency / OpenCodeを実行する`repair-and-validate`、OIDCを持つ`publish`を別jobへ分離した。
  - repair jobへraw Alert、Alert番号、`vulnerability-alerts: read`、`id-token: write`を渡さない契約へ変更した。
  - publish直前にAlert state、GHSA ID、dependency、base SHA、duplicate PR、残存Security branchを再確認する。
  - `pnpm list --json --depth Infinity`をrunnerへinstallされたdependency graphとして扱い、未install targetは`needs_human`へ停止する。
  - lockfile全fieldの独自deep comparisonを削除し、package.json semantic diff、pnpm再生成、installed graph、Dependency Review、Repository標準検証へ寄せた。
  - Cloudflare Preview除外をDependabot、`renovate/` Bot、`security/` Botへ限定し、Expo Dependency Maintenanceの既存Preview契約を維持する。
  - `SECURITY.md`は公開情報境界だけへ縮小し、workflow詳細を持たせない。
  - 自動Security fallbackのtracked Run Artifact例外は、Security PRへ無関係な`.codex/runs/**`を混ぜず最小差分を維持するための狭い例外として理由を明記した。
  - `prConcurrentLimit`未確定がblockする範囲をRenovate configとそのcontract testだけへ限定した。
  - 参考リンクをMarkdown linkへ変更し、現行Web CIの`MD034/no-bare-urls`原因を解消した。
- 以前の記録との関係:
  - 05:15記録の`prConcurrentLimitを1へ固定`は、Issue #163のOwner確認契約と矛盾するため現Planでは採用しない。具体値は未確定blockerとして扱う。
  - 09:00記録は途中で途切れているため、今回checkpointを現時点の判断として参照する。
- 対象範囲: Planとactive Run Artifactだけを変更し、workflow、Renovate設定、package依存、GitHub Settings、Secret、外部Appは変更していない。
- Progress: 100% (8/8)

## 2026-09-19 12:21 (JST) 追記

- job間で渡す`sanitized-security-context.json`と検証済みpackage / lockfile artifactは、publicに再構成できる情報だけへ限定し、retentionを1日に固定した。
- OpenCode processの環境変数allowlistを具体化し、専用`HOME` / `TMPDIR`、Security fallback専用config / permission以外のrunner環境とGitHub / OIDC / Cloudflare credentialを継承しない契約を追加した。
- root parent candidateは同一majorだけでなく、candidate package metadata上のtarget dependency宣言rangeが`first_patched_version`を許容するものへ絞り、最大10件とした。candidateごとの事前install loopは追加しない。
- Progress: 100% (9/9)


## 2026-09-19 13:24 (JST)

- 概要: これまでのレビュー結果を再統合し、実装開始を妨げるSecurity境界と実装時の曖昧さをPlanへ反映した。
- 変更:
  - fallbackを`preflight / read-alert / opencode-edit / validate / publish`の5 jobへ変更し、Zen credentialを持つrunnerとRepository / dependency validation runnerを分離した。
  - `pnpm run verify`後にsemantic guard、lockfile no-op、installed graph、file allowlistを再確認し、最終guard後はRepository / dependency codeを実行しない契約へ変更した。
  - root parent updateを`root -> target`の1 edgeへ限定し、深いtransitive pathはparent-scoped override条件を満たさなければ`needs_human`へ止める。
  - parent-scoped overrideを`<parent>@<baseline-exact-version>><target>`形式へ固定した。
  - OpenCode promptで`AGENTS.md`、repair-loop Skill / reference、Public Repository Hardening P-13を読む契約を復元し、read / edit pathをallowlistで具体化した。
  - 重複PR判定をtarget dependencyの初期確認、graph取得後のroot / override確認、publish前のfinal diff確認へ分離した。
  - job間Artifactを3種類へ固定し、Artifact ID指定、retention 1日、overwrite禁止、個別file SHA-256検証を追加した。
  - Renovateの`prBodyTemplate`、`prBodyColumns`、Package definition、commit message、branch topicをPublic情報だけへ固定した。
  - Security branchを`security/<dependency-key>/<github.run_id>`へ固定し、scoped packageを含むdependency-key生成規則を定義した。
  - tracked Run Artifact例外を撤回した。自動fallbackでもstandard Runの`PLAN.md / TASKS.md / REPORT.md`を完全sanitizationし、作成できなければPRを作らない。
  - PR #167 head `0f47f5e05a55c7a18943fee4b6f3e7d21302061f`のWeb CI / Mobile App CI成功を現状理解へ反映した。
- 対象範囲: Planとactive Run Artifactだけを変更し、workflow、Renovate設定、package依存、GitHub Settings、Secret、外部Appは変更していない。
- Progress: 100% (12/12)


## 2026-09-19 13:24 (JST) 追記

- 直前のPlan反映で残ったMarkdown escapeと、途中で切れた実行タスク / 検証セクションを修復した。
- 設計内容は13:24 checkpointから変更せず、5 job、tracked Run Artifact、最終guard、Artifact handoffの契約を維持した。
- Progress: 100% (12/12)


## 2026-09-19 13:24 (JST) 追加確認

- GitHub Actionsでは`workflow_dispatch` inputが`github.event.inputs`とevent payloadへ存在し、`GITHUB_EVENT_PATH`はそのpayload fileを指すことを公式仕様で確認した。
- Repository / dependency / OpenCode processは通常のGitHub Actions環境を継承せず、`env -i`相当のpublic-safe allowlistで起動する契約をPlanへ追加した。
- `GITHUB_EVENT_PATH`、`GITHUB_TOKEN`、`GH_TOKEN`、OIDC request環境変数、credential / Secretをprocessへ渡さない。
- Progress: 100% (13/13)


## 2026-09-19 15:53 (JST)

- 概要: これまでのレビュー結果を根本原因単位へ統合し、未解決の致命的事項とPR完了条件をPlanへ反映した。
- 変更:
  - Repository実装はPR #167を唯一の実装PRとして継続し、別PRを作らない契約を追加。
  - fallbackを6 jobへ変更し、`validate-exec`で任意コードを実行したrunnerからpublish用Artifactを受け取らず、fresh runnerの`finalize`で差分を再構成する。
  - OpenCode実行前にworkflow自身が`fix-authorization.json`を生成し、baseline vulnerable path、許可strategy、exact mutationを固定する。
  - baseline targetがvulnerable range外なら修正せず停止し、direct / overrideのversion downgradeを拒否する。
  - OpenCode permissionへtop-level `"*": "deny"`を追加し、main / small modelを同じFree modelへ固定、固定`--title`、`formatter: false`、`lsp: false`を追加。
  - download Artifact inputを`artifact-ids`へ修正し、validated Artifactは`include-hidden-files: true`かつ6 file完全列挙へ変更。
  - publish直前にAlert / Advisoryのdependency、ecosystem、GHSA、normalized vulnerable range、first patched versionをauthorizationと再照合する。
  - PR #167 merge時点ではIssue #163をcloseせず、外部activationと実地確認後にcloseする契約へ変更。
- 対象範囲: Plan、active Run Artifact、PR本文だけ。workflow、設定、依存関係、GitHub Settings、Secret、App installationは変更していない。
- Progress: 100% (11/11)


## 2026-09-19 15:53 (JST) 追記

- `fix-authorization.json`へ自己SHA-256を埋め込む自己参照を削除した。authorization fileのSHA-256はJSON生成後にworkflow側で計算し、job output / Artifact検証へ使用する。
- Plan本文の「現head」固定記述を削除し、Plan更新後は最新headのCIを再確認する契約へ変更した。


## 2026-09-19 23:23 (JST)

- 概要: これまでのレビュー結果を再統合し、実装開始を妨げていた残存4件とOpenCodeの不要なdefault plugin経路をPlanへ反映した。
- 変更:
  - 6 job構成は維持し、`validate-exec`が任意Repository / dependency code実行前に`package.json` / `pnpm-lock.yaml` / `fix-authorization.json`を`prepared-security-fix` Artifactへ確定する契約へ変更した。
  - `finalize`はprepared Artifactをhash一致で再利用し、lockfileを再生成しない。これにより`pnpm run verify`で検証したpackage / lockfileとpublish対象を同一にする。
  - authorizationへdirect target、選択root parent、override targetのexpected exact resolved versionを追加し、parent-scoped overrideはselectorに一致するbaseline全edgeを確認する契約へ変更した。
  - installed graphに加え、既存`yaml@2.9.0`でprepared `pnpm-lock.yaml`のtarget packageを構造的に走査し、vulnerable range内versionが残る場合はfail-closedとした。
  - `github.run_attempt == 1`を6 jobすべてのjob-level条件へ固定し、成功済みpreflightを再利用した個別job Re-runでもOpenCode / publishへ進めない契約にした。
  - `.github/workflows/**`全体で`id-token: write`をSecurity fallbackの`publish`だけへ限定するcontractを追加した。
  - OpenCode App OIDC exchangeをaudience `opencode-github-action`、`POST https://api.opencode.ai/exchange_github_app_token`、Bearer OIDC token、bodyなし、JSON `token` responseへ固定し、PAT / write-enabled `GITHUB_TOKEN` fallbackを禁止した。
  - `OPENCODE_DISABLE_DEFAULT_PLUGINS=1`を追加し、`OPENCODE_PURE=1`とは別に固定binary内のdefault pluginも無効化する。
- 対象範囲: Plan、active Run Artifact、PR本文だけ。workflow、Renovate設定、OpenCode設定、validator、依存関係、GitHub Settings、Secret、App installationは変更していない。
- Progress: 100% (11/11)
