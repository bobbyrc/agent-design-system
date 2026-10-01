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

The app, collector, checker, schemas and records are builder-writable. They detect missing/stale/inconsistent evidence but cannot authenticate inspection or resist coordinated alteration. Benchmark capture and grading need a protected evaluator outside that workspace. This one Chromium fixture establishes no production integration, screen-reader or blanket accessibility conformance, quality superiority, native-platform or all-host reliability. The authored teaching example is excluded from held-out/generalization claims. Source rights and archive identities are recorded in [provenance](web-source-provenance.md); no repository license has been selected.
