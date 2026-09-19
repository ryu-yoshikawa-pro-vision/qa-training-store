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
