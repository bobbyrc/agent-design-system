# Repository import

- [x] Import canonical shared skill, generic research/reviews, provenance, and approved guidance.
- [x] Restrict the import to reusable workflow/research; exclude application designs and mixed project reports.
- [x] Complete fresh independent defect and scope review, including provenance-finding closure.
- [x] Run final verification on the settled repository tree: 13 helper tests, 14 canonical byte identities, 24 source-manifest entries, and 37 relative Markdown links passed.
- [x] Commit the approved repository snapshot: `bc4c8a44bb1a68b6cdd6be8bbb68b5ec79701c02`.
- [x] Push the public `bobbyrc/agent-design-system` repository to `master`; remote SHA verified.

## Review

Fresh independent review accepted closure of the low-severity provenance omission and found no blocking defects. The manifest records the transformed lessons file's source and destination hashes and its transformations. Root verification confirmed 32 repository files, 24 source-manifest entries, 37 relative Markdown links, 14 byte-identical canonical skill files, and 13 passing helper tests. The snapshot was published in commit `bc4c8a44bb1a68b6cdd6be8bbb68b5ec79701c02` to the public [repository](https://github.com/bobbyrc/agent-design-system) on `master`. Root verified the exact remote SHA with `git ls-remote` and confirmed a clean working tree after the push.

---

# First working web increment

- [x] Recheck clean master HEAD and repository instructions; isolate working branch.
- [x] Materialize canonical Library source ZIP with identity; read blueprint and inspect both original illustrations.
- [x] Implement synthetic equipment-return web fixture (examples/equipment/: brief, fixture, UI only).
- [x] Implement shared fail-closed evidence runner and negative tests (scripts/, contracts/, package files, CI).
- [x] Add compact router, contextual pattern/profile, host capability boundary and usage documentation (skills/ui-design/, patterns/, profiles/, adapters/, docs/, README).
- [x] Run existing and new checks on settled tree; inspect narrow/wide screenshots and interactions.
- [x] Fresh independent defect review; resolve substantiated findings and rerun final checks.
- [x] Commit, open draft PR and monitor exact-head CI.

## Frozen integration interface

Teaching fixture served at /examples/equipment/index.html by runner-owned local server. Plain HTML/CSS/ES modules; no remote dependencies or services. Source fixtures in examples/equipment/fixtures.json. UI test IDs: search, scope-overdue, scope-all, loan-<id>, detail, back-to-queue, check-recorder, check-microphone, check-cables, return-submit, return-status, queue-count. First fixture id kit-12; return requires all three checks. Search matches kit/borrower. URL ?scenario=save-failure fails first save, retry succeeds; ?scenario=empty, loading, long-content supported. window.equipmentStore is a teaching-only read-only snapshot accessor returning {loans,events,pending}; events contain loanId and type=returned. Async save locks repeated activation; failures preserve checklist and do not mutate confirmed loans. Narrow detail replaces queue and Back restores query/scope and focus. Runtime instrument only; store assertions corroborate UI, not independent integration proof.

Required checks: TASK-RETURN-01, RETURN-FAIL-01, DUPLICATE-01, NARROW-01, KEYBOARD-01, A11Y-AUTO-01, VISUAL-01. Runner owns exact inventory, execution provenance and artifact hashing. VISUAL-01 remains BLOCKED until current-image independent review is recorded; runtime report is builder-writable and not a protected quality evaluator. No held-out or all-host claims.

## Review

Root verification passed 13 preserved measurement tests, 51 unit/negative tests, one actual-browser focus regression, and all seven frozen outcomes after a current-image independent review. Source review closed two verifier findings; image review closed one minor copy finding. Final feature commit `a7affb474a9024996dc45c66b5ee1cd9ae6903c9`, source hash `a50f94fdcf83b8df971c3531b857278cbbb49086af4d00b7d17cc71c655c772b`, capture run `4b80b4f4-11b1-4013-908a-c4bfad3f1340`. See [verification record](../docs/web-increment-verification.md) for scoped evidence and limitations. Draft [PR #1](https://github.com/bobbyrc/agent-design-system/pull/1) is open. Both push and pull-request CI for `de15632632e0b0dc4e8b65ab568854fe283f6082` passed; the [PR run](https://github.com/bobbyrc/agent-design-system/actions/runs/36871172541) produced 52 current-source captures and six machine PASS outcomes, with CI visual acceptance honestly BLOCKED. The documentation closure retains the same source hash; final PR-head CI is monitored in the task. Source pack and generated captures remain outside tracked public source; no global installation, deployment, paid service or license selection.
