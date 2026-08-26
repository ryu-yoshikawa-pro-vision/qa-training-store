# Issue #68 実装Run計画

## Objective

指定された `security/metro-0.84.5-image-size-remediation` Branch / PR #69上で、Issue #68の `image-size` 2件のGHSAに対するMetro `0.84.5` targeted resolutionの成立可否を、実装開始時点のactual dependency graphとPlan指定のWeb / Native検証で確定する。

Metro `0.84.5`の採用は目的ではない。Plan `docs/plans/2026-08-26_200933_metro-0.84.5-image-size-remediation.md`を正本とし、採用条件をすべて満たす場合だけcandidate dependency差分を残す。成立しない場合はcandidateをbaselineへ戻す。

## Scope

### In

- baseline / Run / Branch freshnessの確定。
- baselineの `image-size` / Metro family actual graph、GHSA current status、affected parent edgeの確認。
- Task 2で必要性を確認した最小parent-scoped Metro family resolutionだけのcandidate適用。
- pnpm 9.10.0によるlockfile-only再生成、安定性確認、frozen install。
- Plan指定のimage manifest、Web、Android production bundle、iOS export、local quality gate、Web regression、PR CI確認。
- 標準Run Artifactの更新と、採用時の `package.json` / `pnpm-lock.yaml` targeted差分。

### Out

- Expo / React Native / `@react-native/community-cli-plugin`のversion変更。
- global Metro override、direct `image-size`、`image-size@2.0.2`強制解決、broad update、fork、patch-package。
- application / build config / CI workflow変更、test skip、gate緩和、Alert dismiss、Issue #68以外の脆弱性対応。
- Planで必要とされない第2のremediation方式。

## Assumptions / Questions

- working treeは開始前にcleanであり、current Branchは指定Branchと一致している。
- `origin/main`を含む現在のHEADをbaselineとする。実装中にmainが進んだ場合は、既存変更を破棄せず安全に扱えるかを確認してから判断する。
- iOSのlocal検証はPlanどおり `expo export --platform ios` をpreflightとし、実buildの最終判定はPR上のNative iOS CIとする。
- blocking questionはない。candidate selectorの本数・内容はTask 2完了前に決め打ちしない。

## Hypotheses

- H1: baselineには `@react-native/community-cli-plugin@0.86.2 -> metro@0.84.4 -> image-size@1.2.1` のaffected pathが残っている。
- H2: baselineで列挙したaffected parent edgeに限り `0.84.5`へ解決すれば、affected image-size instanceを0件にできる。
- H3: Metro family targeted resolutionはWeb / Android / iOSのPlan指定preflightと既存品質ゲートを壊さない。

## Ordered approach

PlanのTask 1〜11を順番どおり実行する。

1. branch freshness / baseline / Runを固定する。
2. baseline graphとGHSA statusを確認し、affected parent edgeと最小selector setを編集前に確定する。
3. 確定selectorだけを `package.json`へ追加する。
4. pnpm 9.10.0でlockfileを正規再生成し、同一コマンドの二回目追加diffが0であること、frozen install、affected graphを確認する。
5. Web / asset validationとproduction buildを実行する。
6. Android production bundle preflightを実行する。
7. iOS production export preflightを実行する。
8. `pnpm run verify`、Web Chromium regression、diff checkを実行する。
9. local gate成功後にPR #69へpushし、Web CI / Dependency Review / Mobile App CIの必須gateを確認する。
10. 採用 / 不採用をDoDに基づいて確定する。
11. sanitizer、Markdown lint、最終diff、status、Run Artifactを指定順で最終化する。

## Definition of Done

- 採用時: affected `image-size` instance 0件、baselineのaffected path全消滅、必要最小selector、unrelated semantic dependency changeなし、lockfile安定、frozen install、Plan指定のWeb / Android / iOS / local gate / PR CIがすべて成功。
- 不採用時: `package.json` / `pnpm-lock.yaml` candidate差分をbaselineへ戻し、失敗理由・未実施validation・次候補をRun Artifactへ記録し、第2案を試さない。
- いずれの場合も、Run Artifactをsanitizer Write / Check後にMarkdown lint・最終dependency diff・changed files・status・diff checkまで完了し、PR #69本文を実際の結果へ更新する。

## Risks / Unknowns

- semver compatibleでも実動作互換性は保証されないため、graphが成立してもWeb / Native validationが必須。
- `community-cli-plugin -> metro`だけでは `metro-config`等からaffected `metro@0.84.4`が残る可能性があり、Task 2で全pathを列挙する。
- Metro familyを一律に変更するとscopeを超えるため、必要性を説明できないselectorは追加しない。
- CIが失敗した場合は最初の異常と派生エラーを分離し、scope外の修正・skip・gate緩和をせず、Planの採用 / 不採用条件に従う。

## Source of truth

- 実装手順・採用条件・検証方法: `docs/plans/2026-08-26_200933_metro-0.84.5-image-size-remediation.md`
- Issue / PR: GitHub Issue #68 / PR #69
- 参照調査: `docs/reports/2026-08-26_193322_image-size-vulnerability-remediation-investigation.md`、Issue #56 / PR #67

## Thinking Log

- 2026-08-26 20:58 JST: current Branchは指定Branch、working treeはclean。`origin/main`はHEADの祖先であり、baselineを `e097adff0894e421b28db3c1fd4e3a0c1926eeb1` と固定した。PR #69のheadも同SHAである。
- 2026-08-26 20:58 JST: 既存最新Run `20260826-190631-JST`は別Branchの調査Runとしてcompleted済みのため再利用せず、実装Run `20260826-205812-JST`を作成した。
- 2026-08-26 21:12 JST: baseline graphでは、影響対象のresolved versionは `image-size@1.2.1` の1件。`@react-native/community-cli-plugin@0.86.2`の直接 `metro` / `metro-config` / `metro-core` edgeと、optional peerで実際に解決された `@react-native/metro-config@0.86.1 -> metro-config@0.84.4`を確認した。
- 2026-08-26 21:12 JST: candidate selector setを4件（community pluginの`metro` / `metro-config` / `metro-core`、RN metro-configの`metro-config`）に固定した。`metro-runtime`はaffected `metro`へ到達しないため最小setから除外する。
- 2026-08-26 21:19 JST: Android bundle preflightはAutomation marker存在、Production marker不在、Hermes bundle guard PASSとなった。Plan順にiOS exportへ進む。
- 2026-08-26 21:20 JST: Windows上のPlan指定iOS Metro production exportはexit 0で完了した。Xcode native buildは環境上実行せず、PR CIで確認する。
- 2026-08-26 21:33 JST: `pnpm run verify`、Chromium 27 tests、candidate dependency diff checkがすべてPASSした。local gateを満たしたため、PR #69へ反映してCI adoption gateを確認する。
