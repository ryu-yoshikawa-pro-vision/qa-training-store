# Tasks

## Now

- [x] 1. branch freshness / clean working tree / baselineを記録し、frozen installと`image-size`全resolved instance / parent path（必要ならMetro version）を確定する。
- [x] 2. 公式GHSA 2件と`image-size` upstreamの現在情報を確認し、resolved instance × GHSAのaffected / unaffected、件数、Alert / lockfile / graph整合を確定する。
- [x] 3. affected resolved instanceが残る場合だけ、affected parentごとのexact sourceとvulnerable call pathを特定する。全件unaffectedならN/Aとして完了する。
- [x] 4. affected pathが残る場合だけ、Metro / non-Metroを分離してRepository input source、source control、execution phase、reachabilityを判定する。
- [x] 5. affected pathが残る場合だけ、compatible parent / framework候補とdependency graphへの影響を調査する。
- [x] 6. affected pathが残る場合だけ、既存境界によるworkaroundの5条件を確認する。
- [x] 7. durable reportを作成し、結論、candidate decision matrix、第一候補 / fallback / 見送り理由 / 残存リスク / follow-upを記録する。
- [x] 8. PR #67本文を調査完了状態へ必要最小限更新し、Run Artifactを更新する。
- [ ] 9. sanitizer Write / Check、Markdown lint、final diff / status / semantic scope確認を行い、docs-only commit / explicit push後にPR #67を再確認する。

## Discovered

- なし。

## Blocked

- なし。
