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
- [ ] Implement synthetic equipment-return web fixture (examples/equipment/: brief, fixture, UI only).
- [ ] Implement shared fail-closed evidence runner and negative tests (scripts/, contracts/, package files, CI).
- [ ] Add compact router, contextual pattern/profile, host capability boundary and usage documentation (skills/ui-design/, patterns/, profiles/, adapters/, docs/, README).
- [ ] Run existing and new checks on settled tree; inspect narrow/wide screenshots and interactions.
- [ ] Fresh independent defect review; resolve substantiated findings and rerun final checks.
- [ ] Commit, open draft PR and monitor exact-head CI.

## Frozen integration interface

Teaching fixture served at /examples/equipment/index.html by runner-owned local server. Plain HTML/CSS/ES modules; no remote dependencies or services. Source fixtures in examples/equipment/fixtures.json. UI test IDs: search, scope-overdue, scope-all, loan-<id>, detail, back-to-queue, check-recorder, check-microphone, check-cables, return-submit, return-status, queue-count. First fixture id kit-12; return requires all three checks. Search matches kit/borrower. URL ?scenario=save-failure fails first save, retry succeeds; ?scenario=empty, loading, long-content supported. window.equipmentStore is a teaching-only read-only snapshot accessor returning {loans,events,pending}; events contain loanId and type=returned. Async save locks repeated activation; failures preserve checklist and do not mutate confirmed loans. Narrow detail replaces queue and Back restores query/scope and focus. Runtime instrument only; store assertions corroborate UI, not independent integration proof.

Required checks: TASK-RETURN-01, RETURN-FAIL-01, DUPLICATE-01, NARROW-01, KEYBOARD-01, A11Y-AUTO-01, VISUAL-01. Runner owns exact inventory, execution provenance and artifact hashing. VISUAL-01 remains BLOCKED until current-image independent review is recorded; runtime report is builder-writable and not a protected quality evaluator. No held-out or all-host claims.

## Review

Pending final verification and independent review. Source pack remains local outside repository; no production data, competitor bundles, global skill changes, deployment, paid service, or repository licensing selection.
