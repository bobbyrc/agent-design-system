# Web increment verification

Reproduce checks for the neutral equipment teaching fixture from the repository root with Node 24, the tested major version:

```sh
npm ci
npx playwright install chromium
npm test
npm run test:browser
python3 -m unittest discover -s skills/figma-ui/scripts -p 'test_*.py'
npm run verify:machine
npm run evidence:check -- artifacts/ui-runs/<UUID>/run.json
```

Use the generated run's actual `<UUID>`. A machine-only result does not establish full acceptance: checking stays incomplete until a real independent reviewer record is imported with `npm run evidence:review -- <run.json> <reviewer.json>` and all required current checks pass. See [web workflow](web-workflow.md) for capture, review and refresh instructions and the [contract boundary](../contracts/README.md) for identity, coverage and review requirements. Generated evidence remains untracked; report run identities, environment versions, observed results and exact-head CI in the relevant PR rather than treating this guide as a live run record.

If accessibility captures report nodes requiring manual review, include each derived `finding_id` exactly once in the independent review's `accessibility_triage`, with a disposition (`resolved|accepted|open`) and rationale. These stable IDs bind capture state and width, rule ID, and node target. The frozen `accessibility_scan_inventory` declares every required scan state and width. An automated PASS requires exact current-capture coverage with no duplicates or recorded violations. Open manual items prevent full PASS even if automated checks report zero violations. Resolved image findings must cite every current image of the affected state, or the matching image named by an optional `capture` path; explicit global findings use `scope:"global"` and `state:"global"` and require every current image. The acceptance contract must include `additional_widths`, with positive integer widths or an intentional `[]`.

CI retains uploaded execution artifacts for seven days. Keep application-specific or private images out of this public repository and its public CI artifacts; use only the neutral synthetic fixture for public captures. The review importer creates a non-overwriting copy of an accepted record, but it does not make the copy immutable on disk.

The app, collector, checker, schemas and records are builder-writable. They detect missing/stale/inconsistent evidence but cannot authenticate inspection or resist coordinated alteration. Benchmark capture and grading need a protected evaluator outside that workspace. This one Chromium fixture establishes no production integration, screen-reader or blanket accessibility conformance, quality superiority, native-platform or all-host reliability. The authored teaching example is excluded from held-out/generalization claims. Source rights and archive identities are recorded in [provenance](web-source-provenance.md); no repository license has been selected.
