import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
export const REQUIRED = [
  "TASK-RETURN-01",
  "RETURN-FAIL-01",
  "DUPLICATE-01",
  "NARROW-01",
  "KEYBOARD-01",
  "A11Y-AUTO-01",
  "VISUAL-01",
];
export const sha = (data) =>
  crypto.createHash("sha256").update(data).digest("hex");
const must = (ok, message) => {
  if (!ok) throw new Error(message);
};
const object = (x) => x && typeof x === "object" && !Array.isArray(x);
const digest = (x) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
const date = (x) => typeof x === "string" && Number.isFinite(Date.parse(x));
export function safeFile(root, relative) {
  must(
    typeof relative === "string" &&
      relative.length > 0 &&
      !path.isAbsolute(relative) &&
      !relative.includes("\\") &&
      relative.split("/").every((x) => x && x !== "." && x !== ".."),
    "unsafe evidence path",
  );
  const base = fs.realpathSync(root);
  let file = base;
  for (const part of relative.split("/")) {
    file = path.join(file, part);
    must(!fs.lstatSync(file).isSymbolicLink(), "symlink evidence rejected");
  }
  must(
    fs.statSync(file).isFile() &&
      fs.realpathSync(file).startsWith(base + path.sep),
    "evidence must be a contained regular file",
  );
  return file;
}
function walk(root, relative) {
  const dir = path.join(root, relative);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .sort()
    .flatMap((name) => {
      const rel = `${relative}/${name}`;
      const stat = fs.lstatSync(path.join(root, rel));
      must(!stat.isSymbolicLink(), "source symlink rejected");
      return stat.isDirectory() ? walk(root, rel) : [rel];
    });
}
export function identity(root) {
  const contractBytes = fs.readFileSync(
    path.join(root, "examples/equipment/acceptance.json"),
  );
  const contract = JSON.parse(contractBytes);
  validateContract(contract);
  const fixtureBytes = fs.readFileSync(
    path.join(root, "examples/equipment/fixtures.json"),
  );
  const fixture = JSON.parse(fixtureBytes);
  must(
    fixture.version === contract.fixture_version,
    "fixture version differs from frozen contract",
  );
  const files = [
    ...walk(root, "examples/equipment").filter(
      (x) => !x.endsWith("/acceptance.json") && !x.endsWith("/fixtures.json"),
    ),
    ...walk(root, "scripts"),
    ...walk(root, "contracts"),
    "package.json",
    "package-lock.json",
  ].sort();
  const source = files.map((file) => ({
    path: file,
    sha256: sha(fs.readFileSync(safeFile(root, file))),
  }));
  return {
    source_hash: sha(JSON.stringify(source)),
    contract_hash: sha(contractBytes),
    fixture_hash: sha(fixtureBytes),
    fixture_version: fixture.version,
    source,
    contract,
  };
}
export function validateContract(c) {
  must(
    object(c) &&
      c.schema === "ui-acceptance/v1" &&
      c.illustrative_only === false &&
      typeof c.id === "string" &&
      Number.isInteger(c.revision) &&
      c.revision > 0,
    "invalid or illustrative acceptance contract",
  );
  must(
    Array.isArray(c.checks) && c.checks.length > 0,
    "invalid frozen inventory",
  );
  const ids = c.checks.map((x) => x.id);
  must(
    new Set(ids).size === ids.length &&
      c.checks.every(
        (x) =>
          typeof x.id === "string" &&
          x.id.trim() &&
          x.required === true &&
          typeof x.method === "string" &&
          typeof x.outcome === "string",
      ),
    "missing/duplicate/unknown frozen ID",
  );
  must(
    typeof c.fixture_version === "string" &&
      c.fixture_version.length > 0 &&
      typeof c.route === "string" &&
      c.route.startsWith("/"),
    "malformed acceptance fixture/route",
  );
  must(
    object(c.policy) &&
      object(c.policy.not_applicable) &&
      Array.isArray(c.states) &&
      c.states.length > 0 &&
      Array.isArray(c.viewports) &&
      c.viewports.length > 0,
    "malformed acceptance policy",
  );
  for (const [id, rule] of Object.entries(c.policy.not_applicable))
    must(
      ids.includes(id) &&
        object(rule) &&
        typeof rule.condition === "string" &&
        rule.condition.trim() &&
        typeof rule.rationale === "string" &&
        rule.rationale.trim(),
      "malformed applicability policy",
    );
}
export function binding(run) {
  return {
    run_id: run.run_id,
    source_hash: run.source_hash,
    contract_hash: run.contract_hash,
    fixture_hash: run.fixture_hash,
  };
}
export function artifact(root, relative, run, kind = "assertions") {
  return {
    path: relative,
    sha256: sha(fs.readFileSync(safeFile(root, relative))),
    kind,
    ...binding(run),
  };
}
function verifyArtifact(root, a, run) {
  must(
    object(a) && digest(a.sha256) && typeof a.kind === "string",
    "malformed artifact",
  );
  for (const [key, value] of Object.entries(binding(run)))
    must(a[key] === value, `stale artifact ${key}`);
  must(
    sha(fs.readFileSync(safeFile(root, a.path))) === a.sha256,
    "evidence hash mismatch",
  );
}
export function validateReview(review, run) {
  must(
    object(review) &&
      review.schema === "ui-image-review/v1" &&
      review.illustrative_only === false,
    "invalid/illustrative review",
  );
  for (const [key, value] of Object.entries(binding(run)))
    must(review[key] === value, `stale review ${key}`);
  must(
    typeof review.reviewer === "string" &&
      review.reviewer.trim() &&
      review.independent_context === true,
    "independent reviewer identity/context required",
  );
  must(
    date(review.reviewed_at) &&
      Date.parse(review.reviewed_at) >= Date.parse(run.execution_finished_at) &&
      Date.parse(review.reviewed_at) <= Date.now() + 60000,
    "review time is not fresh",
  );
  must(
    Array.isArray(review.inspection_records) &&
      review.inspection_records.length > 0 &&
      review.inspection_records.every((x) => typeof x === "string" && x.trim()),
    "image inspection records required",
  );
  must(
    run.artifacts.some((x) => x.kind === "image"),
    "visual review requires actual images",
  );
  const wanted = run.artifacts
    .filter((x) => x.kind === "image")
    .map((x) => `${x.path}:${x.sha256}`)
    .sort();
  must(
    Array.isArray(review.images) &&
      review.images.length === wanted.length &&
      new Set(review.images.map((x) => x.path)).size === wanted.length &&
      JSON.stringify(
        review.images.map((x) => `${x.path}:${x.sha256}`).sort(),
      ) === JSON.stringify(wanted),
    "review must cover exact current image inventory",
  );
  must(
    Array.isArray(review.input_evidence_hashes) &&
      JSON.stringify([...review.input_evidence_hashes].sort()) ===
        JSON.stringify(
          run.artifacts
            .filter((x) => x.kind !== "image")
            .map((x) => x.sha256)
            .sort(),
        ),
    "review task evidence inventory differs",
  );
  must(Array.isArray(review.findings), "review findings must be an array");
  for (const f of review.findings) {
    must(
      object(f) &&
        ["blocker", "major", "minor", "preference"].includes(f.severity) &&
        ["open", "resolved", "accepted"].includes(f.disposition),
      "invalid review finding",
    );
    for (const key of [
      "state",
      "region",
      "observation",
      "consequence",
      "acceptance_condition",
    ])
      must(
        typeof f[key] === "string" && f[key].trim(),
        `finding ${key} required`,
      );
    if (f.disposition === "resolved")
      must(
        typeof f.resolution === "string" &&
          f.resolution.trim() &&
          Array.isArray(f.resolution_evidence) &&
          f.resolution_evidence.length > 0 &&
          f.resolution_evidence.every((p) =>
            run.artifacts.some((a) => a.path === p),
          ),
        "resolved finding requires current-artifact resolution rationale and evidence",
      );
    if (f.disposition === "accepted")
      must(
        ["minor", "preference"].includes(f.severity) &&
          typeof f.rationale === "string" &&
          f.rationale.trim(),
        "only minor/preference acceptance with rationale allowed",
      );
  }
  return !review.findings.some(
    (f) => f.disposition === "open" && f.severity !== "preference",
  );
}
export function aggregate(root, run, current, { machineOnly = false } = {}) {
  must(
    object(run) &&
      run.schema === "ui-run/v1" &&
      run.illustrative_only === false,
    "invalid/illustrative run schema",
  );
  must(
    typeof run.run_id === "string" &&
      run.run_id.length > 5 &&
      run.acceptance_contract_id === current.contract.id,
    "invalid run identity",
  );
  for (const key of ["source_hash", "contract_hash", "fixture_hash"])
    must(digest(run[key]) && run[key] === current[key], `stale ${key}`);
  must(
    object(run.artifact) &&
      run.artifact.working_tree_or_build_hash === run.source_hash &&
      (run.artifact.commit === null ||
        /^[a-f0-9]{40}$/.test(run.artifact.commit)),
    "invalid source artifact metadata",
  );
  must(
    run.fixture_version === current.fixture_version &&
      run.integration_mode === "prototype_mock",
    "invalid fixture/integration identity",
  );
  must(
    date(run.execution_started_at) &&
      date(run.execution_finished_at) &&
      Date.parse(run.execution_started_at) <=
        Date.parse(run.execution_finished_at) &&
      Date.parse(run.execution_finished_at) <= Date.now() + 60000,
    "invalid execution timestamps",
  );
  must(
    object(run.environment) &&
      typeof run.environment.host === "string" &&
      run.environment.host.length > 0 &&
      typeof run.environment.host_version === "string" &&
      run.environment.host_version.length > 0 &&
      typeof run.environment.browser_version === "string" &&
      run.environment.browser_version.length > 0 &&
      object(run.environment.tool_versions) &&
      object(run.provenance) &&
      run.provenance.protected_evaluator === false &&
      run.provenance.served_build_identity === run.source_hash,
    "missing execution provenance",
  );
  must(
    Array.isArray(run.artifacts) &&
      run.artifacts.length > 0 &&
      new Set(run.artifacts.map((x) => x.path)).size === run.artifacts.length,
    "invalid artifact inventory",
  );
  run.artifacts.forEach((a) => verifyArtifact(root, a, run));
  must(
    Array.isArray(run.checks) &&
      run.checks.length === current.contract.checks.length,
    "missing/extra required checks",
  );
  const ids = run.checks.map((x) => x.id);
  must(
    new Set(ids).size === ids.length &&
      current.contract.checks.every((c) => ids.includes(c.id)),
    "missing/duplicate/unknown check IDs",
  );
  for (const c of run.checks) {
    must(
      object(c) &&
        ["PASS", "FAIL", "BLOCKED", "NOT_APPLICABLE"].includes(c.result) &&
        typeof c.reason === "string" &&
        Array.isArray(c.evidence) &&
        typeof c.executed === "boolean",
      "malformed check",
    );
    if (c.result === "NOT_APPLICABLE") {
      const rule = current.contract.policy.not_applicable[c.id];
      must(
        rule &&
          c.applicability_condition === rule.condition &&
          c.reason === rule.rationale,
        "unauthorized NOT_APPLICABLE",
      );
    } else if (c.result !== "BLOCKED")
      must(
        c.executed === true && c.evidence.length > 0,
        "unexecuted check cannot pass/fail",
      );
    for (const p of c.evidence)
      must(
        run.artifacts.some((a) => a.path === p),
        "check references unknown evidence",
      );
  }
  const visual = run.checks.find((c) => c.id === "VISUAL-01");
  if (visual?.result === "PASS") {
    must(
      object(run.review) &&
        typeof run.review.path === "string" &&
        digest(run.review.sha256),
      "visual pass needs a review record",
    );
    const file = safeFile(root, run.review.path);
    must(
      sha(fs.readFileSync(file)) === run.review.sha256,
      "review record hash mismatch",
    );
    must(
      validateReview(JSON.parse(fs.readFileSync(file)), run),
      "unresolved review findings",
    );
  }
  if (
    current.contract.capture_inventory &&
    (visual?.result === "PASS" ||
      run.checks
        .filter((c) => c.id !== "VISUAL-01")
        .every((c) => ["PASS", "NOT_APPLICABLE"].includes(c.result)))
  ) {
    must(
      Array.isArray(current.contract.capture_inventory) &&
        current.contract.capture_inventory.length > 0,
      "invalid required capture inventory",
    );
    for (const required of current.contract.capture_inventory)
      must(
        run.artifacts.filter(
          (a) =>
            a.kind === "image" &&
            a.state === required.state &&
            a.width === required.width,
        ).length === 1,
        `missing/duplicate required capture ${required.state}/${required.width}`,
      );
  }
  const selected = run.checks.filter(
    (c) => !machineOnly || c.id !== "VISUAL-01",
  );
  const result = selected.some((c) => c.result === "FAIL")
    ? "FAIL"
    : selected.some((c) => c.result === "BLOCKED")
      ? "BLOCKED"
      : "PASS";
  // A submitted summary is never authoritative, even in machine-only mode.
  const full = run.checks.some((c) => c.result === "FAIL")
    ? "FAIL"
    : run.checks.some((c) => c.result === "BLOCKED")
      ? "BLOCKED"
      : "PASS";
  must(run.result === full, "spoofed/inconsistent summary");
  return {
    result,
    scope: machineOnly ? "machine_checks_only" : "all_required_checks",
    full_result: full,
  };
}
