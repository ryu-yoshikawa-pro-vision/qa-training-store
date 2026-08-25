# Plan

## Objective

- Expo SDK 57のまま、Expo Doctorが要求する7つのpatch dependencyと`expo-constants` overrideだけを整合させ、main baselineのNative CI failureを独立PRで解消する。

## Scope

- In: `package.json`、`pnpm-lock.yaml`、今回のRun Artifact、実装前計画書、指定validation、PR作成とremote Native CI確認。
- Out: Application／Native／Web code、Test仕様、Maestro、CI workflow、React／React Native／TypeScript／Playwright、SDK major/minor migration、Doctor回避設定。

## Assumptions

- 作業ブランチは既に存在するが、`HEAD`、`origin/main`、`FETCH_HEAD`が一致し固有コミットがないため、強制再作成せず継続利用する。
- lockfileは変更後のexact package.jsonを基準にpnpmで再生成し、対象と必要なpeer context以外の更新を残さない。
- Expo APIへの一時的な接続失敗は、dependency mismatchとは別に分類する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。対象、DoD、PR title、PR作成可否は明示済み。
- 仮定してよい細部: 既存のmain由来ブランチを安全に継続利用する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: mainのfrozen install後Doctor failureは、指定7 packageのpatch mismatchを正本として再現する。
- H2: 7 packageと`expo-constants` overrideだけを更新すれば、SDK 57のpackage version checkはPASSする。
- H3: lockfileのpeer context更新後も、Native component／build／runtimeにdependency起因のregressionは発生しない。

## Research Plan

- Round 1 Query: 最新mainのSHA、manifest／lock／Native CI、frozen install後の`pnpm dlx expo-doctor@1.17.6`を確認する。
- Round 2 Query: patch alignment後のlock diff、Doctor、required local validation、PR後のNative CIを確認する。
- Exit Criteria:
  - H1〜H3ごとに支持／反証のEvidenceがある。
  - Doctorの外部API failureとpackage mismatchを分類できる。
  - 未完了のremote／環境依存事項に次アクションがある。

## Approach

- 最新mainとの差分を固定し、baseline Doctorを記録してからpackage manifestの7値とoverrideだけを編集する。lockfileを再生成し、対象外差分を監査してから指定順にvalidationを実行する。最後にSanitizer、commit／push／PR、remote Native CIを確認する。
- 標準フロー: `PLAN -> TASKS -> 実行 -> REPORT`

## Definition of Done

- SDK 57のまま7 packageがDoctor要求patchへ一致し、override／lockfileが整合する。
- frozen install、Doctor 17/17、指定local validationがPASSする。
- 許可外ファイル・依存更新・CI回避設定がなく、remote Native CIに新規dependency起因regressionがない。
- Run Artifact SanitizerがPASSする。

## Risks / Unknowns

- Expo patch更新でpeer contextが変化する可能性があるためlock diffを監査する。
- Expo config schema checkは外部API timeoutになり得るため、patch mismatchと別分類する。
- remote Native CIが失敗した場合、最初の異常とbaseline／今回の因果を確認し、scope外修正を混ぜない。

## Thinking Log

- 2026-08-23 00:16 JST: `origin/main`をfetchし、作業ブランチのHEADと同一SHAであることを確認。強制branch recreateは安全ガードに拒否されたため、固有コミットがない既存branchを継続利用する。
- 2026-08-23 00:16 JST: main frozen install後Doctorは15/17 checks passed、package version checkを含む2 failure。7 packageのexpected／foundは依頼記載と一致し、config schema checkはExpo API timeoutも併発した。

## 2026-08-25 Issue #59 follow-up

### Current understanding

- `fix/expo-sdk-57-patch-alignment` と `origin/fix/expo-sdk-57-patch-alignment` は既存の `2188e20` で一致し、指定 worktree を継続利用する。
- Issue #59 は OPEN。旧PR #47は既にMERGEDであり、旧PRやPR #58を更新せず、今回の追加patch alignmentは新しいPRとして扱う。
- 現行 Expo CLI と `expo-doctor@1.17.6` は、Issue記載どおり7 packageをそれぞれ1 patch更新する契約を返す。

### Change strategy

- `package.json`の7 direct dependencyと`expo-constants` overrideだけを更新する。`expo-linking`、React、React Native、workflow、source、testは変更しない。
- `pnpm install --lockfile-only --ignore-scripts`で再解決し、pnpm serializerの引用符差分は既存Prettier形式へ正規化する。再解決→整形のnormalized diff一致をstable条件とする。
- local Native Static相当と通常品質ゲートを完了後、Run Artifactを追記・Sanitizer確認し、branch safety確認後にexplicit refspecでpushする。

### Validation and open questions

- frozen install、Expo install check、Expo Doctor 17/17、Native Static相当、format、verify、diff check、remote Native CI全gateを完了条件とする。
- pnpm peer warning、lint warning、Native Jestのact warning、SQLite ExperimentalWarningは依存更新の成否と分離して記録する。
- 未解決のblocking questionはない。remote CI failure時は最初のfailureと今回の依存変更との因果を確認してから bounded に対応する。
