# M02→M03 固定Skill統合契約

対象は`ryu-yoshikawa-pro-vision/qa-workflow-skills`のcommit `7cc6cba7772de549841a39d71694cbafbc783324`です。M02の人間可読な検証責務を正本とし、初回の`condition_structure.py`は`input_mode=direct`で起動します。metadataはSkill-local `runtime_contract.py`の17キー、inputは15キー、`test_requirements[]`の各行は`tr_id`/`priority`/`authority_refs`/`risk_refs`/`scope_refs`の5キーに厳密に合わせます。説明文を機械行へ追加しません。

実行経路は `condition_structure(direct)` → 選択した技法runtime → `materialize_coverage(artifact)` → 契約に合うmodeの`case_structure` → `verify_runtime_evidence(valid=true)` です。各段階でcurrent Machine Entity、generation fingerprint、Scope/Authority/Risk参照の集合、期待結果の根拠を照合します。終了コード0、`ready`、AIの自己申告だけでは成功にしません。

このrepositoryで確認できた正式入力は`docs/spec/features/cart.md`のBR-CART-001/AC-CART-001、`training/workbook/README.md`のRISK-CART-001を含みます。開発環境には、このcommit由来の実行可能な`spec-analysis` Authority、`test-analysis` Product Risk、current Scope Machine Entityがまだ確認できていません。したがって、参照IDを作り上げたり、fixtureの結果を実統合として扱ったりせず、current Entityを与える実行はBLOCKEDとします。構造契約のnegative testと、実在資料に基づく人間可読演習は引き続き検証します。

固定revisionの全Package（SKILL.md、references、assets、Skill-local scripts）を配布する場合は、外部repoのcommit tree全体との一致を同期前に検証します。evalsや共有の秘密資料は配布許可リストへ含めません。
