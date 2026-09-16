# Plan

## Objective

- PR #146の現在head `310d5d169a49c9e89453dc6be4d0e51924f4f45c`について、実Codex runtimeで確認できる範囲を確認する。
- Repository内の明示仕様からproduction文章品質rule候補を調査し、ユーザーが採用／見送りを判断できる表にする。
- 今回はproduction ruleを有効化せず、`.codex/text-quality-rules.json`を`not-configured`のまま維持する。

## Scope

- In:
  - branch、PR、Issue #135、CLI version、current Hook contractの再確認。
  - 既存wrapperによるinteractive `/hooks`確認の試行と、同一`CODEX_HOME`条件の記録。
  - 正式なcompact操作の確認、実Codex配送・再注入・fail-closeの確認可能性の判定。
  - `AGENTS.md`、README、Harness文書、ADR、curriculum、Plan、Issue／PR、lint設定の既存明示規約調査。
  - 既存Run Artifactへの調査結果・候補表・未確認事項の記録。
- Out:
  - Hook実装、config、contract test、production scanner、Hook ruleの変更。
  - `.codex/text-quality-rules.json`の変更。
  - trust bypass、Issue／PRのclose／merge、commit／push。

## Assumptions

- PR #146のremote headが指定SHAと一致する間は、実装を作り直さず現在のファイルを正本として確認する。
- interactive端末をこの実行環境から提供できない場合、runtime確認を未確認のまま明示し、contract PASSへ昇格させない。
- 候補ruleはRepository内の明示的なliteral／置換仕様があるものに限り、根拠が無いcategoryは候補0件とする。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。Repository、Issue、Plan、CLI、公式仕様から確認できる範囲で進める。
- 仮定してよい細部: なし。候補の具体値は独自に補わない。
- 未回答の重要質問: interactive Codexを実際に操作できるTTYが実行環境から提供されるか。

## Hypotheses

- H1: contract／CIは成立していても、非TTY実行では`/hooks`とcompact配送のruntime証拠を取得できない可能性がある。
- H2: Repositoryには日本語優先等の方針はあるが、安全な英語allowlistや具体的禁止語・置換表が不足し、production block候補は0件または限定的になる可能性が高い。
- H3: runtime確認のための安全な一時分離環境を作れない場合、fail-close runtimeは未確認として残す。

## Research Plan

- Round 1 Query:
  - 現在head、PR／Issue state、CLI version、wrapper trust手順、Hook contract、rule設定を確認する。
  - OpenAI公式Hook仕様で`SessionStart`、`compact`、structured output、`additionalContextLimit`を再確認する。
- Round 2 Query:
  - Repository-wideの規約と既存lint／validator設定を検索し、候補表の根拠・対象・除外条件・誤検知を整理する。
  - runtime実行結果または制約をRun Artifactへ記録する。
- Exit Criteria:
  - runtimeについて、確認済み／未確認の境界と理由が明示されている。
  - production rule候補について、根拠のある候補だけを表にし、候補0件の場合も理由がある。
  - `not-configured`、Hook実装、PR／Issue stateが維持されている。

## Approach

- 正本Planと既存Harness文書を確認し、まず読み取りのみの状態確認を行う。
- 非TTY経路でinteractive確認を代替せず、wrapperの正規経路を安全に一度試行する。失敗時は具体的な制約を記録する。
- `rg`で候補語を検索し、単なる記述・歴史説明・自然言語方針とRepository-wideの機械的規約を区別する。
- コード変更は行わず、Run Artifactだけを調査記録として更新し、sanitizer／collectorを実行する。

## Definition of Done

- 指定branch／head／PR／Issue #135／CLI versionを再確認済み。
- Hook contract再確認済み。runtimeの`/hooks`、compact、再注入、fail-closeは各々確認済みまたは未確認理由が記録済み。
- Repository-wide調査に基づく候補表が完成し、主観的ruleを含まない。
- `.codex/text-quality-rules.json`、Hook実装、contract、production scannerが無変更。
- Issue #134、PR #146をclose／mergeせず、`Refs #134`を維持する。
- Run Artifactがsanitizedで、commit／pushは行わない。

## Risks / Unknowns

- 対話CLIをPowerShellの非TTYから起動すると`stdin is not a terminal`になる可能性がある。無理に擬似TTYやtrust bypassを導入しない。
- Hook trustはユーザー側状態であり、`CODEX_HOME`の値そのものを記録しない。
- 文章規約の「日本語優先」を単純な英語禁止regexへ変換すると正当な技術用語を壊すため、allowlistが明示されない限り候補から除外する。

## Thinking Log

- 2026-09-14 JST: 新規のruntime／候補調査タスクとしてRun `20260914-211509-JST`を初期化した。既存実装の変更はスコープ外とした。
- 2026-09-14 JST: `gh` executableは環境に無かったため、GitHub MCPでPR／Issueの読み取りを代替する。local／remote／PR headは指定SHAで一致している。
- 2026-09-14 JST: `computer-use` skillはCodex CLI／terminal appの自動操作を禁止しているため、対話CLIをUI自動化で代替しない。非TTY wrapper試行の結果をruntime未確認判定に利用する。
