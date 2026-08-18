# Tasks

## Now

- [x] 1. Working Agreement、SSOT、最新 ADR / Run、実装ハーネスを確認し、strict Run を初期化する
- [x] 2. 最新 main / Open PR / workflow / remote Action / official release・advisory を inventory する
- [x] 3. Cloudflare credential、write-capable principal、GitHub Settings、Ruleset、Security findings の確認済み・未確認境界を記録する
- [x] 4. SSOT に沿う Repository file の変更範囲と CI contract を確定する
- [x] 5. SECURITY / PR Template / Bug・Feature Issue Form / Security contact link を追加する
- [x] 6. README / CONTRIBUTING の導線を最小修正する
- [x] 7. 既存 `ci.yml` に Dependency Review を追加し、`verify` / `deploy-preview` / `validate` の event contract を実装する
- [x] 8. 全 workflow の remote Action を full SHA に pin し、permission / `persist-credentials` の invariant を再確認する
- [x] 9. static contract と正式 quality gate（format / markdown / verify / diff）を実行する
- [x] 10. diff ベース self-review、PR-ready DoD、Security finding / Cloudflare boundary の未完了状態を確認する
- [x] 11. Run Artifact を sanitize Write / Check し、`run.json` / `evaluation.json` / `REPORT.md` を最終更新する
- [x] 12. ユーザー向け最終報告を作成し、Phase 4 の main merge 待ち・Owner 判断待ちを明示する

## Discovered

- （現時点で追加なし）

## Blocked

- B1. Phase 4 の GitHub Settings / Ruleset / PVR / CodeQL / Dependabot Security Updates は、修正版が main に反映されるまで実行しない。
- B2. Cloudflare Token permission / resource scope / Preview・Production sharing / Owner trust classification は、外部 provider と Owner 判断が必要で未完了。
