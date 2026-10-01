# Web increment verification

This is a scoped local verification record for the neutral equipment teaching fixture, not protected benchmark proof. Feature commit: `a7affb474a9024996dc45c66b5ee1cd9ae6903c9`. Current source hash: `a50f94fdcf83b8df971c3531b857278cbbb49086af4d00b7d17cc71c655c772b`. Final root capture run: `4b80b4f4-11b1-4013-908a-c4bfad3f1340`. Generated artifacts are deliberately untracked; recreate them using [web workflow](web-workflow.md).

Root verification used Darwin arm64 release 25.6.0, Node 24.20.0, Playwright 1.58.2, Chromium 145.0.7632.6 and axe-core 4.10.3. The runner hashes source, fixture and acceptance separately and freezes served bytes. This record reports that execution; it is not an independent evidence store.

| Check | Observed result |
| --- | --- |
| Clean `npm ci` | Succeeded |
| `npm test` | 51 unit/negative tests passed |
| Legacy Python comparator tests | 13 passed |
| `npm run test:browser` | One actual-browser negative regression passed |
| `npm run verify:machine` | Six machine checks passed; full acceptance remains separate |
| Final capture inventory | All 52 required images produced |
| Accessibility subset | 26 scans, zero violations, 14 incomplete checks; declared image-review triage only |
| Independent image review | Closed; 38 changed images re-inspected at original resolution, 14 exact-byte images retain explicit prior inspection events |
| Review import and `evidence:check` | Both returned `PASS`, scope `all_required_checks`, full result `PASS`; all seven required checks passed |

The actual-browser regression confirms that removing focus indicators cannot pass because of decorative shadows. Fresh source review also found an unhandled server-listen failure; the targeted repairs were independently closed. An actual EPERM launch artifact kept all seven checks BLOCKED. The checker rejected the earlier `9aebf55e-f4c3-46e4-9b5b-41600fd63e7e` run after the source changed.

The initial independent reviewer inspected all 52 images at original resolution and found one minor misleading prerequisite message after the checklist was complete, including pending/failure states. The note was repaired and a fresh 52-image run produced. The final reviewer resolved the minor finding with fresh current evidence, inspected all 38 byte-changed images, and reused explicit prior inspection events for 14 SHA-256-identical images. All nine fresh non-image inputs were reviewed; no open findings remained. Root imported this actual review and checked the final run; both commands returned full PASS without changing the source hash. Incomplete axe checks concerned redundant aria-hidden symbols; image/task triage does not measure contrast or establish screen-reader behavior.

Reproduce the checks from the repository root:

```sh
npm ci
npx playwright install chromium
npm test
npm run test:browser
python3 -m unittest discover -s skills/figma-ui/scripts -p 'test_*.py'
npm run verify:machine
npm run evidence:check -- artifacts/ui-runs/<UUID>/run.json
```

Use the new command's actual `<UUID>`, not the historical run ID as an expected output. For a newly generated run, full checking stays incomplete until a real independent reviewer record is imported with `npm run evidence:review -- <run.json> <reviewer.json>` and current checks pass. See the [contract boundary](../contracts/README.md) for exact identity, coverage and review requirements.

The app, collector, checker, schemas and records are builder-writable. They detect missing/stale/inconsistent evidence but cannot authenticate inspection or resist coordinated alteration. Benchmark capture and grading need a protected evaluator outside that workspace. This one Chromium fixture establishes no production integration, screen-reader or blanket accessibility conformance, quality superiority, native-platform or all-host reliability. The authored teaching example is excluded from held-out/generalization claims. Source rights and archive identities are recorded in [provenance](web-source-provenance.md); no repository license has been selected.
