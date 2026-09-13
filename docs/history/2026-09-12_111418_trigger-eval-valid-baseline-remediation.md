# PR #127 valid baseline remediation investigation

2026-09-12、PR #127のcanonical `all`で欠落した`exploratory-qa` sideを調査した。

- 固定provenanceはEvaluator SHA `4921023c7f6ad2f2c7f8b8041ec3b08bf707c51e`、Routing SHA `55cb43abb06fa96dd3f283d7ae4a20b6076af5f5`、Codex `0.153.4`、dataset fingerprint `84456cef0270fe58a41a9df3bcb3a00a33c52566189072c16050ed02d3f66161`。
- `exploratory-qa-train-001`と対向ownerのexpected exploratory 2件は、OTel collection completed、control valid 1、Skill point 1、`unknown_skill`、process timed_outだった。
- `exploratory-qa-validation-001`はOTel reliable absence候補（control valid 1、Skill point 0）だったが、process timed_outのためtrusted absenceを成立させず、evaluator結果は`unobservable/timeout`だった。
- 保存済みOTel diagnosticにはunknown `skill`属性の実値とstatusがなく、既存observer/evaluator contract testはunknownをfail-closeするため、source defectを証明できなかった。推測alias、Hook fallback、query変更、canonical retryは行わず、valid baseline未取得のまま停止した。

詳細なRun Artifactは`.codex/runs/20260912-110511-JST/`、canonical evidenceは`.artifacts/trigger-eval-qualification-20260912-02/canonical/`にある。
