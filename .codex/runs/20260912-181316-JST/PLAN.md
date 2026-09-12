# Plan

## Objective

- 既存raw evidenceとCodex Skill inventoryを使い、`exploratory-qa-train-001`で観測された`playwright` Skillの由来・scope・`exploratory-qa`との同時観測の意味を確定する。
- `android-native-local-validation-train-002`と`android-native-local-validation-validation-002`のSkill 0件・327秒timeoutについて、Skill read、stdout/stderr、process lifecycle、OTel、runner契約を時系列で照合し、原因と修正対象を分離する。
- 原因が確定し、変更対象と判定基準を具体化できる場合だけ、実装Planを`docs/plans/`へ保存する。実装は行わない。

## Scope

- In:
  - 開始状態、PR、前回Run、前回raw evidence、Routing SHA、Codex versionの確認。
  - repository canonical Skill inventoryとCodex local Skill inventoryのmetadata／必要なSKILL.md本文の読み取り。
  - 対象3ケースの既存stdout／stderr／meta／process／OTel／相関可能なHook evidenceの読み取り。
  - Codex `0.153.4`相当のSkill loader／injection仕様、observer、evaluator、runner lifecycle、ADR-0024の照合。
  - 原因の確度（確認済み／可能性／未確認）の分類、3ケース比較表、修正要否の判断。
  - Run Artifact、必要な実装Plan、PR本文、evaluation、指定validation、commit／non-force push、CI状態の同期。
- Out:
  - 対象3ケースの再実行、retry、Qualification、canonical `all`、8/8、valid baseline判定。
  - tracked source、test、Skill、dataset、query、timeout、alias、normalization、observer/evaluatorロジック、Hook scoringの変更。
  - raw evidenceの変更・補完・上書き、merge conflict解消、merge、rebase、force push。
  - API key、token、credential、auth file、cookies、無関係なユーザーファイル／Codex sessionの読み取り。

## Assumptions

- 指定raw evidenceは診断の唯一のruntime実行根拠とし、欠落した事実を推測で補わない。
- `CODEX_HOME`が設定されていればそのSkill rootを優先し、未設定時だけ既定の`$HOME/.codex/skills`相当を確認する。
- GitHub PR本文の更新・commit・non-force push・CI確認はユーザーが明示した範囲の通常操作として扱う。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。対象、禁止事項、成果物、検証、PR同期条件が明示されている。
- 仮定してよい細部: local Skillのscopeは配置と本文から確認できた範囲だけを記録し、確認できないscopeは未確認とする。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `playwright`はrepository canonical Skillではなく、Codex利用可能な別scopeのSkillであり、queryのbrowser／UI-flow操作triggerにより`exploratory-qa`と同一turnでimplicit invokeされた可能性がある。実体path・本文・raw read evidenceで検証する。
- H2: `skill_values=["exploratory-qa","playwright"]`が`unknown_skill`になるのは、ADR-0024のcanonical Skill完全一致とunknown／複数Skill fail-close経路による可能性がある。`classifyOtelObservation()`と`isSkillName()`で検証する。
- H3: Android 2件のSkill 0件timeoutは、routing evidence取得前／未実施、Skill read後のtelemetry欠落、またはrouting後のtask completion待ちのいずれかであり、最後の実イベントとSKILL.md read痕跡を比較して分離する。
- H4: runnerがSkill identity取得後もchild processの終了またはtimeoutまで待つ設計であれば、routing outcomeとprocess lifecycleのtimeoutは別の評価軸であり、runner lifecycle変更要否は既存契約との整合で判断する。

## Research Plan

- Round 1 Query: branch／PR／HEAD、前回Run、raw artifact構造、repository／Codex local Skill inventory、ADR-0024、対象コードを確認する。
- Round 2 Query: 3ケースのraw stdout／stderr／meta／process／OTel／Hook evidenceをevent順に抽出し、SKILL.md readとtimeout直前の意味ある処理を照合する。
- Round 3 Query: Codex `0.153.4`相当のsource/tagが取得可能か確認し、`codex.skill.injected`のemit条件、implicit、attribute、status、複数point仕様をobserver／runnerと突合する。
- Round 4 Query: 原因をA（canonical外Skill）、B（metric欠落）、C（process timeout）、D（query/routing）に分け、Plan作成条件とPR記載内容を確定する。
- Exit Criteria:
  - `playwright`のrepository性、local実体、scope、description、query trigger整合、同時invoke evidence、OTel値、unknown判定経路に根拠がある。
  - Android 2件についてSkill read有無、event順、最後の意味あるevent、stderr、timeout直前処理、routing前後を各々確認済み／未確認で分類できる。
  - 修正対象と変更後の判定基準を具体化できる場合は実装Planを保存し、できない場合は最小追加証拠だけを記録する。
  - Run ArtifactとPR本文が同じ実値を参照し、指定validationとCI状態が記録される。

## Approach

- 前回Runとraw evidenceを読み取り専用で固定し、新しいraw evidenceは必要な場合だけ別`.artifacts/trigger-eval-routing-investigation-<timestamp>/`へ保存する。
- Skill inventory、SKILL.md、Codex source、tracked observer／runnerを相互に照合する。Skill名やscopeを`plugin_id`だけから推測しない。
- 3ケースのJSONLを再実行せず、line/event順・tool／command・path・terminal event・process metadataを事実として抽出する。
- 原因ごとの確度を明示し、observer contract、runner lifecycle、telemetry制約、dataset/query、timeout、Result schemaを別々に判定する。
- Planを作る場合も計画書のみを作成し、tracked source／test／Skill等の実装へ進まない。

## Definition of Done

- 指定開始状態とPR実値、対象3ケースの既存証拠、Skill inventory、observer／runner／Codex仕様をRun Artifactへ日本語で記録する。
- `playwright`の由来と`exploratory-qa`との関係、Android 2件のtimeout原因を、確認済み／可能性／未確認に分けて結論化する。
- 修正対象と判定基準が特定できた場合は、指定pathの実装Planに目的、原因、変更対象、処理経路、ADR／observer／runner／dataset／schema／回帰／再実行条件を含める。
- Run Artifact、必要なPlanだけがtracked変更となり、raw evidenceは未変更のまま、Sanitizer、strict collector、format／Markdown lint、evaluation schema、diff checkを通過する。
- PR本文を日本語で更新し、branch parityを確認したnon-force push後、`gh pr checks 127`の最終実値を記録する。merge conflictは解消しない。

## Risks / Unknowns

- Codex `0.153.4`のtag／sourceが取得できない場合、取得不能を明記し、main／別versionから断定しない。
- raw stdoutが省略・無出力の場合、Skill routing未実施やbrowser/server待機を事実として断定しない。
- unknown Skillを無条件に無視するPlanは、誤routingを見逃す危険があるため、canonical／environment-provided／unexpected unknownの区別と判定基準を必須とする。
- PR APIの`mergeable`が時間差で変化する可能性があるため、確認時点の実値を記録し、conflict解消操作は行わない。

## Thinking Log

- 2026-09-12 JST: 開始HEADは指定の`fd83c55467f1cd818171e0caa85d099b37e904d9`、branchは指定branch、worktreeはclean。新規strict Runを作成し、前回Run・raw evidenceには追記しない。
- 2026-09-12 JST: 前回diagnosticは3件ともOTel collection completedだが、今回の目的はOTel値の保存ではなく、Skill実体／read／process eventと契約の因果を確定することに限定する。
