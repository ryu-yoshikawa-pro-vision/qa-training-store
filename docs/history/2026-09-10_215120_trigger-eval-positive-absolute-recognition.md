# Trigger Eval positive blocker absolute recognition（2026-09-10）

PR #127のpositive Qualification blocker remediationで、Hostが出力するabsolute Skill pathをTarget-awareに観測する契約を確定した。

- selectorはpreflightで解決したRouting Target rootをcontextとして受け取る。
- Host pathはuntrusted inputとし、存在、regular file、realpath成功、Target内containment、6 canonical `SKILL.md`とのresolved path完全一致、一意mappingをすべて満たす場合だけ`canonical_skill`へ昇格する。
- 条件不成立はrunner-level failureではなく`unreliable`へfail-closeする。Target contextなしabsolute、任意absolute path、suffixだけの一致は受理しない。
- `realpathOrFail()`はpreflightで存在必須のroot/pathに限定し、relative direct read、exact negative compound、candidate prefix、compound非対応、Result schema 2は変更しない。
