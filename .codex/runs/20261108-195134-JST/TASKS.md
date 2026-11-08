# タスク

## Now

- [x] PR #199の正本・現在HEAD・既存Runと禁止変更範囲を確認する。
- [x] 管理ユーザー変更の拒否・許可時のWeb DB 23テーブルに対する不変性をQA契約に追加する。
- [x] 最終adminの競合模擬における全23テーブルの変更境界をQA契約に追加する。
- [x] 横断51件の各Caseに既存実Runの部分証拠と未検証条件を区別して紐付け、静的回帰契約を追加する。
- [x] 在庫・Order/Shipmentで拒否時の全23表不変と正常時の許可テーブル境界を実CIで確認する。固定HEAD `d95f6922`のWeb CI #42474779455のVitest契約4件PASS。
- [x] Native SQLite（Node実SQL）でGuest Cart・Version・Seed失敗後の23テーブルrollbackを検証し、Android実Runtime未受入を区別する。HEAD `759feb37`のWeb CI #42476883806で契約4件PASS。
- [x] 変更前HEAD `759feb37`のWeb CI全体SUCCESS、Mobile CI全体FAIL（Gradle配布ZIP timeout、native-ci/verify）を照合する。
- [x] B案のマージ前7件・後続12件・7.2の2段階受入を既存Plan・継続手順に反映する。
- [ ] B案の1.2、1.3、1.4と外部AI安全条件の実ゲートを検証する。
- [ ] 独立レビューと最終HEADの必須CI・Artifact・マージ判定を確認する。

## Blocked

- [ ] 既存Planの第三者権利・本人OpenCode/Provider・実モデル・M10 Private workflow・スクリーンリーダー・独立レビューは外部入力と実環境の確認が必要なため、正式受入を維持する。
