# Plan

## Objective

- PR #24のCheckout Address `default/android`について、既存の修正が二重navigationによる`resumed` stateのfail-openを閉じていることを確認し、必要なローカル検証と証跡を完了する。

## Scope

- In:
  - `SCREEN-CHECKOUT-ADDRESS/default/android`のregistry/setup/ready意味論
  - `regular-member`のsession、active Cart、Cart Item、active Checkout Session前提
  - Payment／Confirm専用setup、Category ready分離、25 Android caseのmapping契約
  - 関連contract/component/static validation、Final Visual Gateの現状確認
- Out:
  - Git、PR、workflow dispatch、canonical capture／promotion
  - Product UX、generic Capture DSL、Final Gate、startup helper、Payment／Confirm setupの再設計
  - 既に実装済みのsourceを同じ目的で再編集すること

## Assumptions

- 現worktreeには直近repairでAddress mappingとcontract testが既に反映されている。
- 今回のrunではsourceの追加変更が不要なら、既存実装を変更せず検証結果だけを記録する。
- `native-checkout-session-started`はNormative defaultの必須visual要素として明記されていないため、ready条件へ機械的に追加しない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。ユーザー指定の最小修正方針と既存実装で判断可能。
- 仮定してよい細部: 既存のhistory／contract testを今回の修正記録として再利用する。
- 未回答の重要質問: なし。

## Hypotheses

- H1: Address defaultが`customer-seeded-session`になっていれば、setup側はTarget Routeを開かず、共通Capture flowの一度のroute navigationで新規Checkout Sessionを開始する。
- H2: `regular-member`のcurrent active Cartに紐づくactive Checkout Sessionがないことをcontract testで保証すれば、Address defaultの意図しない`resumed` stateを構造的に防げる。
- H3: Payment／Confirmは専用checkout setupを維持し、Address変更の影響を受けない。

## Research Plan

- Round 1 Query: registry、setup plan、capture flow、Native Checkout state、seed dataset、Normative specificationを確認する。
- Round 2 Query: Address／Visual contract、Native component、full test、build／static／Final Gateを実行し、環境依存failureを切り分ける。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach

- 既存修正の有無を確認し、差分を広げず、対象契約を上流から順に検証する。
- Test timeoutは無目的にコードへ反映せず、単独実行で環境負荷かsource failureかを切り分ける。
- API34 runtime／canonical captureが利用できない場合は未実行／blockedを維持する。
- 標準フロー: `PLAN -> repo mapping -> TASKS -> 実行 -> REPORT`

## Definition of Done

- Address defaultが`customer-seeded-session`、`checkout-address-screen`、regular-member／customerである。
- `regular-member`にcurrent active Cart向けactive Checkout Sessionがないことをcontractで保証する。
- Payment／Confirm専用setup、Category ready分離、Final Gate fail-closeを維持する。
- structural／type／lint／contract／Native component／関連static validationを確認する。
- Final Visual GateはCaptured 69/94、Blocked 25、Pending 0の期待FAILを維持し、API34 canonical captureは実行しない。
- Run artifactを日本語で更新し、sanitizer Write／CheckをPASSさせる。

## Risks / Unknowns

- Windows共有runtime／別worktreeの長時間Node／Gradle processにより、VitestやExpo buildの既定timeoutを超える可能性がある。対象suite単独実行で事実を確認し、processを停止しない。
- `serve-web-dist` cleanupがWindows Temp lockでEPERMになる可能性がある。テスト本体の結果とcleanup failureを分離して記録する。
- API34 canonical emulatorがないため、runtime stateの実測証明はできない。未実行をPASSへ昇格しない。

## Thinking Log

- 2026-08-14: registryはAddress defaultが既に`customer-seeded-session`、Payment／Confirmが専用setupであることを確認した。
- 2026-08-14: `regular-member`はcustomer session、member Cart、basic-shirt variant itemをseedし、default fixtureのcheckout sessionはconverted／consumed履歴でcurrent active Cartへ紐づかない。contract testはこの意味論を直接検証している。
- 2026-08-14: Normative defaultのExpected UIは配送先選択と次Step Actionであり、started noticeを必須visual要素とはしていないため、ready条件はroot＋active-session markerのまま維持する。
- 2026-08-14: 現worktreeのsource変更は既に存在する修正として扱い、今回のrunで追加編集しない。
