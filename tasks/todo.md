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

## Follow-up review repair plan

- [x] App unit: `examples/equipment/app.js`, `examples/equipment/index.html` if needed, and `scripts/equipment.browser.mjs`; repair explicit navigation/outcome state, resize history and skip-link navigation.
- [x] Runner unit: `scripts/verify-equipment.mjs`, runner regression tests, and `examples/equipment/acceptance.json` if needed; execute the claimed narrow-layout checks and select the independent review check by method.
- [x] Documentation unit: `package.json`, `package-lock.json`, `adapters/README.md`, and task files; remove the unsupported engine ceiling and link the local smoke record to PR #1.
- [x] On the settled tree, run regressions and aggregate checks, capture fresh evidence, and complete independent source and actual-image review.
- [ ] Push the reviewed fixes to the same draft PR; verify source/PR refs, exact-head CI, and genuinely addressed thread dispositions.

These units have disjoint file ownership. The contract method `independent_actual_image_review` remains the review-gate interface; the runner's NARROW-01 evidence must execute each behavior it certifies. Final verification and review depend on all three units; publication and thread closure depend on that verification. Run-specific results remain in [PR #1](https://github.com/bobbyrc/agent-design-system/pull/1).

### Follow-up review status

Fresh independent source and actual-image review accepted the scoped repairs with no active findings. Runner review's visible-focus coverage finding is repaired and independently closed. Settled-tree regressions and the full local evidence aggregate passed after importing the independent review. Publication, exact-head CI and thread closure remain pending; local visual acceptance does not establish CI visual acceptance.

## PR review repair plan

- [x] Evidence unit: `scripts/evidence*`, `contracts/`; validate artifact bytes, contract requirements and review import.
- [x] Runner unit: `scripts/focus*`, `scripts/server*`, `scripts/verify-equipment.mjs`; repair executed checks and network boundary.
- [x] App unit: `examples/equipment/`, `scripts/equipment.browser.mjs`; repair loading, locking, navigation and reflow states.
- [x] Documentation unit: `skills/ui-design/`, profiles, patterns, adapters and workflow docs; clarify adoption and reproducibility.
- [x] On the settled tree, run regressions and fresh capture, then independent source and image review.
- [x] Push the reviewed fixes; confirm exact-head CI and address review threads.

The units have disjoint file ownership. Existing artifact fields and the contract method `independent_actual_image_review` are the integration interface; method identity controls the independent review gate. Final checks and review depend on all four units.

- [x] Recheck clean master HEAD and repository instructions; isolate working branch.
- [x] Materialize AI Design Agent Framework Source Pack.zip with identity; read blueprint and inspect both original illustrations.
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

The initial increment is delivered in draft [PR #1](https://github.com/bobbyrc/agent-design-system/pull/1). Independent source and actual-image review accepted the scoped repairs, including follow-up findings discovered during verification. Requested inline threads were addressed and resolved. Reproduction instructions and evidence limits are in the [verification guide](../docs/web-increment-verification.md). Run-specific results, comment dispositions and exact-head CI are recorded in the PR.
