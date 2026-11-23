# Plan（計画）

## Objective（目的）

- 本人が確定したSkill権利・Codex生成画像・外部Provider・1.2配布安全性の判断を既存正本に反映し、同じ確認の繰り返しと判定矛盾を解消する。

## Scope（対象範囲）

- In: 統合受入Plan、継続手順、固定Skill監査履歴、learner第三者通知、AGENTSの参照指示、Issue #228、PR #199本文。
- Out: 新しい権利監査、実Provider接続・認証・課金・保持調査、外部AI評価の開始、製品SUT変更、Public Templateの公開、PR merge/close。

## Assumptions（仮定）

- 本人のこのターンの明示決定を権利・配布意思・実Providerの範囲に関する正本として扱う。
- 1.2のIssue移管後の受入時点は、公開・外部配布前でありPRマージ前ではない。Issue移管自体はPASSとしない。
- 1.4は本人決定と無関係の第三者由来素材に限る。既存記録に具体的に挙がるReact Navigation Elements画像と生成Web JS依存の証拠範囲を記述し、未知の素材があると推測して範囲を拡大しない。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。必要な判定はPlanへ根拠と再開条件を記録する。
- 仮定してよい細部: 本人決定に反する旧記述は履歴ラベルを付け、現行表が優先と明記する。
- 未回答の重要質問: なし。

## Hypotheses（仮説）

- H1: 既存Plan・Issue・PR本文に残る古いBLOCKED文言が、本人の現在の決定と矛盾している。
- H2: 現行ルールを統合Planへ集約し、他文書を参照させれば再確認を防ぎつつ未監査物の公開制限を維持できる。

## Research Plan（調査計画）

- Round 1 Query: 作業状態、正本、既存Run、PR #199 HEAD、Issue #228本文を確認する。
- Round 2 Query: 各決定に反する現在文言を見つけ、歴史記録と現行判断を分離する。
- Exit Criteria:
  - 受入状態は統合受入Planに一意に定義され、別文書は参照または履歴となる。
  - Issue #228とPR本文がPlanに整合し、未監査物の公開禁止が残る。

## Approach（進め方）

- 統合受入Planに現行決定を記録し、継続手順・監査履歴・学習者NOTICE・AGENTS・Issue #228・PR本文を整合させる。
- 差分の書式、リンク、sanitizer/securityを確認し、既存PRブランチへ記録を反映する。
- 標準フロー: `PLAN -> 既存証拠確認 -> 更新 -> 検証 -> commit/push -> latest-head CI -> PR本文更新`

## Definition of Done（完了条件）

- Skill 13件の本人作成・既存MIT範囲・配布意思が明確で、旧監査BLOCKEDは当時の履歴として保持される。
- Codex生成画像とExpo Router／React Navigation等の第三者素材が区別される。
- 実Provider受入はPR #199のマージ前条件から外れ、fail-closed拒否テストの維持が明記される。
- 1.2はIssue #228で未受入のまま継続し、公開・外部配布前に受入することと、Issue移管がPASSでないことが記録される。
- PR本文とPlanが同じ受入時点・判定を示し、最新PR HEADのWeb/Mobile CIが確認される。

## Risks / Unknowns（リスク・未知点）

- 具体的な第三者素材として既存通知に記載されたReact Navigation Elements PNG5件は、固定元revisionが不足している。生成Web JSの通知は歴史HEADに紐づき、完全な現行bundle閉包を示さない。一般的な懸念で対象を広げず、Planに記した具体的証拠不足を残す。
- Issue #228の未監査Template payloadは引き続き公開不可。PR #199のmerge許可や公開許可をこの作業で決めない。

## Thinking Log（判断記録）

- PR #199/Issue #228の現在情報を取得。PRはOPEN、head `00670f8ca016845e288f019ae5ad160ca1eca051`、main `b8beb9f05db93acd509ca4c35741a7dbab1b4ccd`。ローカルHEADとPR HEADは一致。`git fetch origin`は`.git/worktrees/.../FETCH_HEAD` read-onlyのため通常実行失敗。リモート状態はGitHub PR APIで一致を確認した。
- Issue #228はOPENで、旧本文は1.2を「マージ前必須」としていたため、本人決定に合わせ受入時点を公開前へ訂正。Issueは閉じていない。
- 2026-11-23本人決定に基づく解釈は、1.2を公開前条件として保持しつつマージ前条件から除外すること。1.3は固定Skillに限りPASS、1.4は具体的に記載した第三者素材のみ継続。
