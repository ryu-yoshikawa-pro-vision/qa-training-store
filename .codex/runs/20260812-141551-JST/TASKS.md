# Tasks

## Now

- [x] 1. Baseline、ADR、旧Plan、既存agent/config/verifyを確認する
- [x] 2. 新Planを`docs/plans/`へ保存し、Run PLANへ反映する
- [x] 3. read-only researcher結果を統合し、変更方針を確定する
- [x] 4. config、5 agent、AGENTS、verify scriptsを更新する
- [x] 5. TOML/static validationを実行する
- [x] 6. 5 agentのNative smoke testを実行する（initial same-session quality_gate_runnerはBLOCKED、fresh Parent sessionのNative spawn / validationはPASS）
- [x] 7. `pnpm run verify`、sanitizer、scope auditを実行する
- [x] 8. REPORT、run.json、TASKSを確定する

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- [x] D1. Native runtimeがproject custom agentのmodel metadataを直接表示できなくても、独自runtime監査を追加しない方針を確認した。

## 過去のブロッカー（解消済み）

- B1. Initial same-session attemptでは、Codex CLI 0.147.0のNative delegation APIが`quality_gate_runner`を`unknown agent_type`として拒否した。これは履歴として保持し、独自fallback/wrapperは作成していない。
- Resolution: fresh Parent sessionで`quality_gate_runner`のNative spawnとParent指定validationがPASSし、最終状態のblockerではない。

## フォローアップ (2026-08-12 15:18 JST)

- B1は解消。fresh Parent sessionのNative runtimeで`quality_gate_runner`をspawnし、Parent指定validationを実行した。
- `implementation_worker`のRun ownership smokeをserialで実施し、指定TOMLの1文言だけを変更、新規child Run Artifactなしを確認した。
- WSL UbuntuのPOSIX/LF overlayで`bash scripts/verify`を実行した。初回FAILはPR-localのverify contract update omissionだったため、旧運用文言を復活させずverify側を修正して再実行し、PASSを確認した。

Progress: 100% (9/9)
