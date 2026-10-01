# Host adapters

Adapters use the same [UI entry](../skills/ui-design/SKILL.md), [web workflow](../docs/web-workflow.md), acceptance contract and shared runner. They describe capability checks and invocation, not new design policy or automatic enforcement.

| Host | Implemented scope | Verification status |
| --- | --- | --- |
| [Codex](codex.md) | Local project instructions and shared runner invocation | Local execution smoke is recorded with actual artifacts; installation and completion lifecycle are separate |
| [Claude Code](claude-code.md) | Specification only | Unverified; no hook supplied |
| [Pi](pi.md) | Specification only | Unverified; no extension supplied |
| Native platforms | Outside this web increment | No native adapter or compatibility claim |

A successful local runner command does not establish host discovery, interruption or completion behavior across versions. Before any broader compatibility claim, pin host/model/tool versions and exercise fresh/missing/stale evidence, required BLOCKED, interruption, bounded repeated failures, reference-mode requirements, final-edit invalidation and illustrative-instance rejection. A continuation ceiling ends incomplete work; it never authorizes PASS.

Local app, runner, contract and evidence files are builder-writable. Their validation improves consistency but cannot independently attest trustworthy capture or prevent coordinated alteration. Benchmark grading requires capture, served-build and store assertions in a protected evaluator outside the builder-writable workspace or CI-controlled boundary.
