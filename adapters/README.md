# Host runner adapters

These host runner adapters describe local runner capability and completion boundaries. They are distinct from the Figma [harness adapters](../skills/figma-ui/references/harnesses.md), which document host discovery/invocation, and the per-project [runtime adapter template](../skills/figma-ui/assets/adapter.md), which records application launch, capture and measurement instructions. Read the harness reference for version-scoped host mechanisms; this checkout-only web entry must be read from the complete repository.

Host runner adapters use the same [UI entry](../skills/ui-design/SKILL.md), [web workflow](../docs/web-workflow.md), acceptance contract and shared runner. They describe capability checks and invocation, not new design policy or automatic enforcement.

| Host | Implemented scope | Verification status |
| --- | --- | --- |
| [Codex](codex.md) | Local project instructions and shared runner invocation | Local execution smoke is recorded with actual artifacts; installation and completion lifecycle are separate |
| [Claude Code](claude-code.md) | Specification only | Unverified; no hook supplied |
| [Pi](pi.md) | Specification only | Unverified; no extension supplied |
| Native platforms | Outside this web increment | No native adapter or compatibility claim |

A successful local runner command does not establish host discovery, interruption or completion behavior across versions. Before any broader compatibility claim, pin host/model/tool versions and implement and execute the following smoke checklist in that actual host. This is an acceptance checklist for future host integration, not a supplied executable suite:

- [ ] Load the entry from the complete checkout; resolve its linked profile, pattern and workflow.
- [ ] Execute a fresh shared-runner capture; confirm machine scope and independently reviewed full completion remain distinct.
- [ ] Remove required evidence; verify completion stays BLOCKED or is rejected.
- [ ] Edit source after capture; verify stale evidence is rejected.
- [ ] Interrupt execution; verify no success is recorded and reentry requires fresh evidence.
- [ ] Cause repeated failures; verify bounded continuation ends incomplete without changing acceptance.
- [ ] Select reference mode; verify its approved manifest/reference requirements survive routing.
- [ ] Make a final edit after review; verify prior completion is invalidated.
- [ ] Supply illustrative source-template identities instead of executed evidence; verify rejection.

A continuation ceiling ends incomplete work; it never authorizes PASS.

Local app, runner, contract and evidence files are builder-writable. Their validation improves consistency but cannot independently attest trustworthy capture or prevent coordinated alteration. Benchmark grading requires capture, served-build and store assertions in a protected evaluator outside the builder-writable workspace or CI-controlled boundary.
