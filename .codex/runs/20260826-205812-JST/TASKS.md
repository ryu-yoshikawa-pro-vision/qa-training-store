# Tasks

## Now

- [x] 1. branch freshness / clean working tree / baseline / Runを確定する。
- [x] 2. baselineのIssue #68前提、GHSA current status、image-size / Metro family actual graphを確認し、affected parent edgeと最小selector setを編集前に確定する。
- [x] 3. Task 2で確定した最小parent-scoped resolution setだけを `package.json`へ適用する。
- [x] 4. pnpm 9.10.0でlockfileを二回正規再生成し、frozen installとcandidate graph / semantic diffを確認する。
- [x] 5. Plan指定のproduction環境値でimage manifest validationとWeb production buildを実行する。
- [x] 6. Android production bundle preflight（Automation / Production export、Hermes bundle guard）を実行する。
- [x] 7. iOS Metro production export preflightを実行する。
- [x] 8. `pnpm run verify`、Web Chromium regression、local diff checkを実行する。
- [x] 9. local gate成功後、PR #69へcommit / pushし、Web CI / Dependency Review / Mobile App CIのPlan指定gateを確認する。
- [x] 10. Planの採用 / 不採用DoDとscopeを照合し、candidateを残すかbaselineへ戻すか確定する。
- [x] 11. Run Artifactを指定順でsanitizer、Markdown lint、最終diff / status確認まで実施して最終化する。

## Discovered

- [x] F1. レビュー指摘をtriageし、4 selectorから`metro-core`だけを外した3 selector candidateを適用する。
- [x] F2. pnpm 9.10.0でlockfileを二回正規再生成し、frozen installと3 selectorのactual graph / semantic diffを確認する。
- [x] F3. 3 selector candidateのlocal validation、PR CI adoption gate、採用判断を再実行する。
- [ ] F4. Run ArtifactとPR本文を3 selectorの実結果へ追記・更新し、sanitizer / lint / diff / status確認後にcommit / pushする。

## Blocked

- なし。
