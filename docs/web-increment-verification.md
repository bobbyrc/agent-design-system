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

## Draft PR and observed CI

The [draft PR](https://github.com/bobbyrc/agent-design-system/pull/1) was confirmed as draft at head `de15632632e0b0dc4e8b65ab568854fe283f6082`. Both push and PR CI succeeded for that head. The [observed PR CI run](https://github.com/bobbyrc/agent-design-system/actions/runs/36871172541) published `equipment-ui-evidence`; root downloaded and inspected its run record and artifact inventory. These are historical results for that exact head, not a promise about subsequent documentation commits or future CI runs.

The Linux run was `651fb022-aa14-49a4-990b-dee8adcc9d30`, with the same source hash `a50f94fdcf83b8df971c3531b857278cbbb49086af4d00b7d17cc71c655c772b`. It produced all 52 required images and passed six machine checks while correctly leaving `VISUAL-01` BLOCKED. Its environment was Linux x64, Node 24.21.0, Playwright 1.58.2, Chromium 145.0.7632.6 and axe-core 4.10.3. Those CI images have not received independent visual acceptance. CI success therefore establishes its configured machine scope; the seven-check PASS above belongs to the separately reviewed local macOS run. Neither establishes all-host support or a protected benchmark boundary.

Recommended CLI guidance entry: use `gh` for GitHub branch, PR and CI operations when the native connector action cannot be called. This records the fallback used in publication; it does not change shared guidance or install a tool.
