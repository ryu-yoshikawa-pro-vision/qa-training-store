# Tasks

## Now

- [x] 1. Baseline、ADR、旧Plan、既存agent/config/verifyを確認する
- [x] 2. 新Planを`docs/plans/`へ保存し、Run PLANへ反映する
- [x] 3. read-only researcher結果を統合し、変更方針を確定する
- [x] 4. config、5 agent、AGENTS、verify scriptsを更新する
- [x] 5. TOML/static validationを実行する
- [x] 6. 5 agentのNative smoke testを実行する（quality_gate_runnerはruntime capabilityでBLOCKED）
- [x] 7. `pnpm run verify`、sanitizer、scope auditを実行する
- [x] 8. REPORT、run.json、TASKSを確定する

## Discovered

- 作業中に発見したタスクはここに追記する（セッション内で増える前提）
- D1. Native runtimeがproject custom agentのmodel metadataを表示しない場合は、独自runtime監査を追加せず、REPORTへ未確認として記録する。

## Blocked

- B1. Codex CLI 0.147.0の現Native delegation APIが`quality_gate_runner`を`unknown agent_type`として拒否した。TOML/staticはPASSだが、quality runnerのNative smokeとそのvalidationは未実行。独自fallback/wrapperは作らず、Codex runtime更新またはcustom role discovery対応後に再実行する。

## Follow-up (2026-08-12 15:18 JST)

- B1は解消。fresh Parent sessionのNative runtimeで`quality_gate_runner`をspawnし、Parent指定validationを実行した。
- `implementation_worker`のRun ownership smokeをserialで実施し、指定TOMLの1文言だけを変更、新規child Run Artifactなしを確認した。
- WSL UbuntuのPOSIX/LF overlayで`bash scripts/verify`を実行した。LF入力はPASSしたが、HEAD以前から存在するtemplate contract不整合でFAILしたため、古い運用文言は追加しない。

Progress: 100% (8/8)
