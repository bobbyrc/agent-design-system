import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  aggregate,
  identity,
  artifact,
  sha,
  validateReview,
  REQUIRED,
} from "./evidence.mjs";
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ui-evidence-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "examples/equipment"), { recursive: true });
  fs.mkdirSync(path.join(root, "artifacts"));
  const acceptance = JSON.parse(
    fs.readFileSync(
      new URL("../examples/equipment/acceptance.json", import.meta.url),
    ),
  );
  fs.writeFileSync(
    path.join(root, "examples/equipment/acceptance.json"),
    JSON.stringify(acceptance),
  );
  fs.writeFileSync(
    path.join(root, "examples/equipment/fixtures.json"),
    JSON.stringify({ version: acceptance.fixture_version }),
  );
  fs.writeFileSync(
    path.join(root, "examples/equipment/index.html"),
    "<p>fixture</p>",
  );
  for (const f of ["package.json", "package-lock.json"])
    fs.writeFileSync(path.join(root, f), "{}");
  const current = identity(root),
    now = new Date().toISOString();
  const run = {
    artifact: { commit: null, working_tree_or_build_hash: current.source_hash },
    schema: "ui-run/v1",
    illustrative_only: false,
    run_id: "test-run-123",
    acceptance_contract_id: acceptance.id,
    ...Object.fromEntries(
      ["source_hash", "contract_hash", "fixture_hash", "fixture_version"].map(
        (k) => [k, current[k]],
      ),
    ),
    integration_mode: "prototype_mock",
    execution_started_at: now,
    execution_finished_at: now,
    environment: {
      host: "unit-test-only",
      host_version: process.version,
      browser_version: "test-chromium",
      tool_versions: { node: process.version },
    },
    provenance: {
      protected_evaluator: false,
      served_build_identity: current.source_hash,
    },
    artifacts: [],
    checks: [],
    review: null,
    result: "BLOCKED",
  };
  fs.writeFileSync(path.join(root, "artifacts/assertions.json"), "{}");
  run.artifacts = [artifact(root, "artifacts/assertions.json", run)];
  for (const capture of current.contract.capture_inventory) {
    const rel = `artifacts/${capture.state}.png`;
    fs.writeFileSync(
      path.join(root, rel),
      "Unit-test image bytes only; never execution evidence",
    );
    run.artifacts.push({ ...artifact(root, rel, run, "image"), ...capture });
  }
  run.checks = REQUIRED.map((id) => ({
    id,
    result: id === "VISUAL-01" ? "BLOCKED" : "PASS",
    reason: "unit fixture",
    executed: id !== "VISUAL-01",
    evidence: ["artifacts/assertions.json"],
  }));
  return { root, run, current };
}
function review(run) {
  return {
    schema: "ui-image-review/v1",
    illustrative_only: false,
    run_id: run.run_id,
    source_hash: run.source_hash,
    contract_hash: run.contract_hash,
    fixture_hash: run.fixture_hash,
    reviewer: "unit reviewer",
    independent_context: true,
    reviewed_at: new Date().toISOString(),
    images: run.artifacts
      .filter((x) => x.kind === "image")
      .map(({ path, sha256 }) => ({ path, sha256 })),
    input_evidence_hashes: run.artifacts
      .filter((x) => x.kind !== "image")
      .map((x) => x.sha256),
    inspection_records: ["unit-only fake event; not real completion evidence"],
    findings: [],
  };
}
const reject = (t, mutate, pattern) => {
  const f = fixture(t);
  mutate(f);
  assert.throws(() => aggregate(f.root, f.run, identity(f.root)), pattern);
};
test("machine-only result is scoped PASS, full result remains BLOCKED", (t) => {
  const f = fixture(t);
  assert.deepEqual(aggregate(f.root, f.run, f.current, { machineOnly: true }), {
    result: "PASS",
    scope: "machine_checks_only",
    full_result: "BLOCKED",
  });
  assert.equal(aggregate(f.root, f.run, f.current).result, "BLOCKED");
});
test("missing required check rejected", (t) =>
  reject(t, (f) => f.run.checks.pop(), /missing/));
test("duplicate check rejected", (t) =>
  reject(t, (f) => (f.run.checks[1].id = f.run.checks[0].id), /duplicate/));
test("unknown check rejected", (t) =>
  reject(t, (f) => (f.run.checks[1].id = "UNKNOWN"), /unknown/));
test("unexecuted pass rejected", (t) =>
  reject(t, (f) => (f.run.checks[0].executed = false), /unexecuted/));
test("pass without evidence rejected", (t) =>
  reject(t, (f) => (f.run.checks[0].evidence = []), /unexecuted/));
test("unauthorized not applicable rejected", (t) =>
  reject(
    t,
    (f) => {
      f.run.checks[0].result = "NOT_APPLICABLE";
      f.run.checks[0].reason = "I said so";
    },
    /unauthorized/,
  ));
test("illustrative run rejected", (t) =>
  reject(t, (f) => (f.run.illustrative_only = true), /illustrative/));
test("illustrative frozen contract rejected", (t) => {
  const f = fixture(t);
  const p = path.join(f.root, "examples/equipment/acceptance.json"),
    c = JSON.parse(fs.readFileSync(p));
  c.illustrative_only = true;
  fs.writeFileSync(p, JSON.stringify(c));
  assert.throws(() => identity(f.root), /illustrative/);
});
test("malformed checks rejected", (t) =>
  reject(t, (f) => (f.run.checks = "PASS"), /required checks/));
test("malformed schema rejected", (t) =>
  reject(t, (f) => (f.run.schema = "ui-run/v1-proposed"), /schema/));
test("spoofed overall PASS rejected", (t) =>
  reject(t, (f) => (f.run.result = "PASS"), /spoofed/));
test("source edit invalidates run", (t) =>
  reject(
    t,
    (f) =>
      fs.writeFileSync(
        path.join(f.root, "examples/equipment/index.html"),
        "changed",
      ),
    /stale source/,
  ));
test("fixture edit invalidates run", (t) =>
  reject(
    t,
    (f) =>
      fs.writeFileSync(
        path.join(f.root, "examples/equipment/fixtures.json"),
        JSON.stringify({ version: f.current.fixture_version, changed: true }),
      ),
    /stale fixture/,
  ));
test("contract edit invalidates run", (t) =>
  reject(
    t,
    (f) => {
      const p = path.join(f.root, "examples/equipment/acceptance.json"),
        c = JSON.parse(fs.readFileSync(p));
      c.revision++;
      fs.writeFileSync(p, JSON.stringify(c));
    },
    /stale contract/,
  ));
test("evidence edit invalidates run", (t) =>
  reject(
    t,
    (f) =>
      fs.writeFileSync(
        path.join(f.root, "artifacts/assertions.json"),
        "changed",
      ),
    /hash mismatch/,
  ));
test("stale artifact binding rejected", (t) =>
  reject(
    t,
    (f) => (f.run.artifacts[0].fixture_hash = "a".repeat(64)),
    /stale artifact/,
  ));
test("served identity tampering rejected", (t) =>
  reject(
    t,
    (f) => (f.run.provenance.served_build_identity = "a".repeat(64)),
    /provenance/,
  ));
test("traversal rejected", (t) =>
  reject(t, (f) => (f.run.artifacts[0].path = "../elsewhere"), /unsafe/));
test("absolute path rejected", (t) =>
  reject(t, (f) => (f.run.artifacts[0].path = "/tmp/file"), /unsafe/));
test("symlink rejected even if target is inside artifact directory", (t) =>
  reject(
    t,
    (f) => {
      fs.symlinkSync("assertions.json", path.join(f.root, "artifacts/link"));
      f.run.artifacts[0].path = "artifacts/link";
    },
    /symlink/,
  ));
test("visual cannot be passed by summary or image alone", (t) =>
  reject(
    t,
    (f) => {
      f.run.checks.at(-1).result = "PASS";
      f.run.checks.at(-1).executed = true;
      f.run.result = "PASS";
    },
    /review record/,
  ));
test("valid review record can compute full pass (does not authenticate reviewer)", (t) => {
  const f = fixture(t),
    r = review(f.run);
  fs.writeFileSync(
    path.join(f.root, "artifacts/review.json"),
    JSON.stringify(r),
  );
  f.run.review = {
    path: "artifacts/review.json",
    sha256: sha(fs.readFileSync(path.join(f.root, "artifacts/review.json"))),
  };
  f.run.checks.at(-1).result = "PASS";
  f.run.checks.at(-1).executed = true;
  f.run.result = "PASS";
  assert.equal(aggregate(f.root, f.run, f.current).result, "PASS");
});
test("review cannot omit an image", (t) => {
  const f = fixture(t),
    r = review(f.run);
  r.images = [];
  assert.throws(() => validateReview(r, f.run), /inventory/);
});
test("review cannot bless zero images", (t) => {
  const f = fixture(t);
  f.run.artifacts = f.run.artifacts.filter((x) => x.kind !== "image");
  assert.throws(() => validateReview(review(f.run), f.run), /actual images/);
});
test("stale review run/source rejected", (t) => {
  const f = fixture(t),
    r = review(f.run);
  r.source_hash = "a".repeat(64);
  assert.throws(() => validateReview(r, f.run), /stale review/);
});
test("future review rejected", (t) => {
  const f = fixture(t),
    r = review(f.run);
  r.reviewed_at = "2099-01-01T00:00:00Z";
  assert.throws(() => validateReview(r, f.run), /time/);
});
test("review inspection event absent rejected", (t) => {
  const f = fixture(t),
    r = review(f.run);
  r.inspection_records = [];
  assert.throws(() => validateReview(r, f.run), /inspection/);
});
const finding = {
  state: "queue",
  region: "header",
  observation: "clipping",
  consequence: "cannot read",
  severity: "major",
  acceptance_condition: "readable header",
  disposition: "open",
};
test("unresolved major finding prevents review PASS", (t) => {
  const f = fixture(t),
    r = review(f.run);
  r.findings = [finding];
  assert.equal(validateReview(r, f.run), false);
});
test("major cannot be accepted away", (t) => {
  const f = fixture(t),
    r = review(f.run);
  r.findings = [{ ...finding, disposition: "accepted", rationale: "ship it" }];
  assert.throws(() => validateReview(r, f.run), /only minor/);
});
test("major claimed resolved without current evidence rejected", (t) => {
  const f = fixture(t),
    r = review(f.run);
  r.findings = [{ ...finding, disposition: "resolved" }];
  assert.throws(() => validateReview(r, f.run), /resolution/);
});
test("minor needs explicit accepted rationale", (t) => {
  const f = fixture(t),
    r = review(f.run);
  r.findings = [{ ...finding, severity: "minor", disposition: "accepted" }];
  assert.throws(() => validateReview(r, f.run), /rationale/);
});
test("shared aggregator inventory comes from contract, not equipment IDs", (t) => {
  const f = fixture(t),
    p = path.join(f.root, "examples/equipment/acceptance.json"),
    c = f.current.contract;
  c.checks = [
    {
      id: "ANOTHER-TASK",
      method: "assertion",
      outcome: "observed",
      required: true,
    },
  ];
  fs.writeFileSync(p, JSON.stringify(c));
  const now = identity(f.root);
  f.run.contract_hash = now.contract_hash;
  f.run.artifacts.forEach((a) => (a.contract_hash = now.contract_hash));
  f.run.checks = [
    {
      id: "ANOTHER-TASK",
      executed: true,
      result: "PASS",
      reason: "observed",
      evidence: ["artifacts/assertions.json"],
    },
  ];
  f.run.result = "PASS";
  assert.equal(aggregate(f.root, f.run, now).result, "PASS");
});

test("extra result ID rejected", (t) =>
  reject(
    t,
    (f) => f.run.checks.push({ ...f.run.checks[0], id: "EXTRA" }),
    /extra/,
  ));
test("malformed executed flag rejected", (t) =>
  reject(t, (f) => delete f.run.checks.at(-1).executed, /malformed check/));
test("source artifact hash tampering rejected", (t) =>
  reject(
    t,
    (f) => (f.run.artifact.working_tree_or_build_hash = "a".repeat(64)),
    /metadata/,
  ));
test("malformed host metadata rejected", (t) =>
  reject(t, (f) => delete f.run.environment.host, /provenance/));
test("stale review image hash rejected", (t) => {
  const f = fixture(t),
    r = review(f.run);
  r.images[0].sha256 = "a".repeat(64);
  assert.throws(() => validateReview(r, f.run), /inventory/);
});
test("review task evidence cannot be omitted", (t) => {
  const f = fixture(t),
    r = review(f.run);
  r.input_evidence_hashes = [];
  assert.throws(() => validateReview(r, f.run), /evidence inventory/);
});
test("same-context reviewer rejected", (t) => {
  const f = fixture(t),
    r = review(f.run);
  r.independent_context = false;
  assert.throws(() => validateReview(r, f.run), /context/);
});
test("illustrative review rejected", (t) => {
  const f = fixture(t),
    r = review(f.run);
  r.illustrative_only = true;
  assert.throws(() => validateReview(r, f.run), /illustrative/);
});
test("frozen applicability policy is the only authority", (t) => {
  const f = fixture(t),
    p = path.join(f.root, "examples/equipment/acceptance.json"),
    c = f.current.contract;
  c.policy.not_applicable["KEYBOARD-01"] = {
    condition: "hardware unavailable",
    rationale: "Explicit test policy fixture only",
  };
  fs.writeFileSync(p, JSON.stringify(c));
  const current = identity(f.root);
  f.run.contract_hash = current.contract_hash;
  f.run.artifacts.forEach((a) => (a.contract_hash = current.contract_hash));
  const check = f.run.checks.find((x) => x.id === "KEYBOARD-01");
  check.result = "NOT_APPLICABLE";
  check.applicability_condition = "hardware unavailable";
  check.reason = "Explicit test policy fixture only";
  assert.equal(
    aggregate(f.root, f.run, current, { machineOnly: true }).result,
    "PASS",
  );
  check.reason = "arbitrary";
  assert.throws(() => aggregate(f.root, f.run, current), /unauthorized/);
});

test("missing required state image rejected even if remaining hashes are current", (t) =>
  reject(
    t,
    (f) =>
      (f.run.artifacts = f.run.artifacts.filter(
        (a) => a.state !== "pending-390",
      )),
    /required capture/,
  ));
test("duplicate required state image rejected", (t) =>
  reject(
    t,
    (f) => {
      const a = f.run.artifacts.find((x) => x.kind === "image");
      fs.copyFileSync(
        path.join(f.root, a.path),
        path.join(f.root, "artifacts/copy.png"),
      );
      f.run.artifacts.push({ ...a, path: "artifacts/copy.png" });
    },
    /required capture/,
  ));
