import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { inflateSync } from "node:zlib";
export const REVIEW_METHOD = "independent_actual_image_review";
export const reviewCheckIds = (contract) =>
  contract.checks.filter((c) => c.method === REVIEW_METHOD).map((c) => c.id);
export const sha = (data) =>
  crypto.createHash("sha256").update(data).digest("hex");
const must = (ok, message) => {
  if (!ok) throw new Error(message);
};
const object = (x) => x && typeof x === "object" && !Array.isArray(x);
const digest = (x) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
const text = (x) => typeof x === "string" && x.trim().length > 0;
function date(value) {
  if (typeof value !== "string") return false;
  const parts =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(
      value,
    );
  if (!parts || !Number.isFinite(Date.parse(value))) return false;
  const [
    year,
    month,
    day,
    hour,
    minute,
    second,
    offsetHour = 0,
    offsetMinute = 0,
  ] = parts
    .slice(1)
    .map((part) => (part === undefined ? undefined : Number(part)));
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= days[month - 1] &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    offsetHour <= 23 &&
    offsetMinute <= 59
  );
}
const runPrefix = (run) => `artifacts/ui-runs/${run.run_id}/`;
function containedArtifact(root, relative, run) {
  must(
    typeof relative === "string" && relative.startsWith(runPrefix(run)),
    "evidence outside current run directory",
  );
  return safeFile(root, relative);
}
export function pngDimensions(bytes) {
  must(
    bytes.length >= 33 &&
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    "image evidence must be PNG",
  );
  let offset = 8,
    header,
    ended = false;
  const data = [];
  while (offset + 12 <= bytes.length) {
    const size = bytes.readUInt32BE(offset),
      type = bytes.toString("ascii", offset + 4, offset + 8);
    must(offset + size + 12 <= bytes.length, "truncated PNG chunk");
    let crc = 0xffffffff;
    for (const byte of bytes.subarray(offset + 4, offset + 8 + size)) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++)
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    must(
      (crc ^ 0xffffffff) >>> 0 === bytes.readUInt32BE(offset + size + 8),
      "PNG chunk checksum mismatch",
    );
    const chunk = bytes.subarray(offset + 8, offset + 8 + size);
    if (!header) {
      must(type === "IHDR" && size === 13, "PNG IHDR required");
      header = { width: chunk.readUInt32BE(0), height: chunk.readUInt32BE(4) };
      must(
        header.width > 0 &&
          header.height > 0 &&
          chunk[8] === 8 &&
          [0, 2, 4, 6].includes(chunk[9]) &&
          chunk[10] === 0 &&
          chunk[11] === 0 &&
          chunk[12] === 0,
        "unsupported/malformed PNG header",
      );
      header.channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[chunk[9]];
    } else if (type === "IDAT") data.push(chunk);
    if (type === "IEND") {
      must(size === 0, "invalid PNG end");
      ended = true;
      offset += size + 12;
      break;
    }
    offset += size + 12;
  }
  must(
    ended && offset === bytes.length && data.length > 0,
    "incomplete PNG image",
  );
  const expected = (1 + header.width * header.channels) * header.height;
  const pixels = inflateSync(Buffer.concat(data), {
    maxOutputLength: expected,
  });
  must(pixels.length === expected, "PNG pixel dimensions differ");
  for (let row = 0; row < header.height; row++)
    must(
      pixels[row * (1 + header.width * header.channels)] <= 4,
      "invalid PNG row filter",
    );
  return { width: header.width, height: header.height };
}
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
      (x) =>
        x !== "examples/equipment/acceptance.json" &&
        x !== "examples/equipment/fixtures.json",
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
      text(c.id) &&
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
          text(x.method) &&
          text(x.outcome),
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
  must(
    c.integration_mode === "prototype_mock" &&
      text(c.change_policy) &&
      Array.isArray(c.limitations) &&
      c.limitations.every(text),
    "malformed acceptance integration/change policy/limitations",
  );
  must(
    c.states.every(text) &&
      new Set(c.states).size === c.states.length &&
      c.viewports.every(
        (v) =>
          object(v) &&
          Number.isInteger(v.width) &&
          v.width > 0 &&
          Number.isInteger(v.height) &&
          v.height > 0,
      ),
    "malformed acceptance states/viewports",
  );
  must(
    Array.isArray(c.additional_widths) &&
      c.additional_widths.every((width) => Number.isInteger(width) && width > 0),
    "additional_widths must be a positive-integer array (empty allowed)",
  );
  must(
    Array.isArray(c.capture_inventory) &&
      c.capture_inventory.length > 0 &&
      c.capture_inventory.every(
        (x) =>
          object(x) &&
          text(x.state) &&
          Number.isInteger(x.width) &&
          x.width > 0,
      ) &&
      new Set(c.capture_inventory.map((x) => x.state)).size ===
        c.capture_inventory.length,
    "invalid required capture inventory",
  );
  if (c.capture_equivalence_groups !== undefined) {
    const groups = c.capture_equivalence_groups;
    const known = new Map(c.capture_inventory.map((x) => [x.state, x.width]));
    must(
      Array.isArray(groups) &&
        groups.every(
          (group) =>
            Array.isArray(group) &&
            group.length >= 2 &&
            group.every((state) => text(state) && known.has(state)) &&
            new Set(group.map((state) => known.get(state))).size === 1,
        ) &&
        new Set(groups.flat()).size === groups.flat().length,
      "invalid capture equivalence groups",
    );
  }
  must(reviewCheckIds(c).length > 0, "independent image review check required");
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
    sha(fs.readFileSync(containedArtifact(root, a.path, run))) === a.sha256,
    "evidence hash mismatch",
  );
  if (a.kind === "image") {
    const dimensions = pngDimensions(
      fs.readFileSync(containedArtifact(root, a.path, run)),
    );
    must(
      text(a.state) &&
        a.width === dimensions.width &&
        (a.height === undefined || a.height === dimensions.height),
      "image capture dimensions/identity mismatch",
    );
  }
}
export function accessibilityFindingId(state, width, ruleId, target) {
  return `axe-${sha(JSON.stringify([state, width, ruleId, target]))}`;
}
const nodeTarget = (target) => Array.isArray(target) && target.length > 0 &&
  target.every((selector) => text(selector) || nodeTarget(selector));
export function accessibilityFindings(root, run) {
  const findings = [];
  for (const a of run.artifacts.filter((a) => a.kind === "accessibility")) {
    const scans = JSON.parse(fs.readFileSync(containedArtifact(root, a.path, run)));
    must(Array.isArray(scans), "malformed accessibility scans");
    for (const scan of scans) {
      must(
        object(scan) && Array.isArray(scan.violations) && Array.isArray(scan.incomplete) &&
          run.artifacts.some((image) => image.kind === "image" &&
            image.path === scan.capture && image.state === scan.state && image.width === scan.width),
        "accessibility scan requires matching current capture",
      );
      for (const rule of scan.incomplete) {
        must(object(rule) && text(rule.id) && Array.isArray(rule.nodes) && rule.nodes.length > 0,
          "malformed manual accessibility rule");
        for (const node of rule.nodes) {
          must(object(node) && nodeTarget(node.target),
            "manual accessibility node target required");
          const id = accessibilityFindingId(scan.state, scan.width, rule.id, node.target);
          must(node.finding_id === id, "manual accessibility finding identity mismatch");
          findings.push({ finding_id: id, capture: scan.capture, state: scan.state,
            width: scan.width, rule_id: rule.id, target: node.target });
        }
      }
    }
  }
  must(new Set(findings.map((f) => f.finding_id)).size === findings.length,
    "duplicate manual accessibility finding identity");
  return findings;
}
export function validateReview(review, run, manualFindings = []) {
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
      review.input_evidence_hashes.length > 0 &&
      review.input_evidence_hashes.every(digest) &&
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
  const triage = review.accessibility_triage ?? [];
  must(Array.isArray(triage) && triage.every(object) && triage.length === manualFindings.length &&
    new Set(triage.map((item) => item.finding_id)).size === triage.length &&
    triage.every((item) => object(item) && manualFindings.some((f) => f.finding_id === item.finding_id) &&
      ["open", "resolved", "accepted"].includes(item.disposition) && text(item.rationale)),
    "every manual accessibility finding requires exact disposition and rationale");
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
    must(f.scope === undefined || ["capture", "global"].includes(f.scope), "invalid finding scope");
    const relevant = run.artifacts.filter((a) => a.kind === "image" &&
      (f.scope === "global" || (a.state === f.state && (f.capture === undefined || a.path === f.capture))));
    must(relevant.length > 0 && (f.scope !== "global" || (f.state === "global" && f.capture === undefined)),
      "finding state/capture must identify current images (global scope must be explicit)");
    if (f.disposition === "resolved")
      must(
        typeof f.resolution === "string" &&
          f.resolution.trim() &&
          Array.isArray(f.resolution_evidence) &&
          f.resolution_evidence.length > 0 &&
          new Set(f.resolution_evidence).size === f.resolution_evidence.length &&
          f.resolution_evidence.every((p) => relevant.some((a) => a.path === p)) &&
          relevant.every((a) => f.resolution_evidence.includes(a.path)),
        "resolved finding requires current-artifact images for its state/capture scope and resolution rationale",
      );
    if (f.disposition === "accepted")
      must(
        ["minor", "preference"].includes(f.severity) &&
          typeof f.rationale === "string" &&
          f.rationale.trim(),
        "only minor/preference acceptance with rationale allowed",
      );
  }
  return !triage.some((item) => item.disposition === "open") && !review.findings.some(
    (f) => f.disposition === "open" && f.severity !== "preference",
  );
}
export function aggregate(
  root,
  run,
  current,
  { machineOnly = false, reviewBytes = null } = {},
) {
  validateContract(current.contract);
  must(
    object(run) &&
      run.schema === "ui-run/v1" &&
      run.illustrative_only === false,
    "invalid/illustrative run schema",
  );
  must(
    Object.hasOwn(run, "review") &&
      (run.review === null ||
        (object(run.review) &&
          text(run.review.path) &&
          digest(run.review.sha256))),
    "missing/malformed required review field",
  );
  must(
    typeof run.run_id === "string" &&
      /^[a-zA-Z0-9_-]+$/.test(run.run_id) &&
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
  const runtimeArtifacts = run.artifacts.filter((a) => a.kind === "runtime");
  const inventoryArtifacts = run.artifacts.filter(
    (a) => a.kind === "inventory",
  );
  must(
    runtimeArtifacts.length === 1 && inventoryArtifacts.length === 1,
    "runtime and capture inventory evidence required",
  );
  const read = (a) =>
    JSON.parse(fs.readFileSync(containedArtifact(root, a.path, run)));
  const runtime = read(runtimeArtifacts[0]);
  must(
    runtime.served_build_identity === current.source_hash &&
      Array.isArray(runtime.served) &&
      Array.isArray(runtime.runtime_errors) &&
      Array.isArray(runtime.requests),
    "stale runtime served identity",
  );
  const sources = new Map(current.source.map((x) => ["/" + x.path, x.sha256]));
  sources.set("/examples/equipment/fixtures.json", current.fixture_hash);
  for (const served of runtime.served)
    must(
      served.build === current.source_hash &&
        sources.get(served.path) === served.sha256,
      "stale served-file evidence",
    );
  const captures = read(inventoryArtifacts[0]),
    images = run.artifacts.filter((a) => a.kind === "image");
  must(
    Array.isArray(captures) &&
      captures.length === images.length &&
      new Set(captures.map((x) => x.path)).size === captures.length &&
      captures.every((x) =>
        images.some(
          (a) =>
            a.path === x.path &&
            a.sha256 === x.sha256 &&
            a.state === x.state &&
            a.width === x.width,
        ),
      ),
    "capture inventory differs from image bytes/identity",
  );
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
  const runtimeFailed =
    runtime.runtime_errors.length > 0 ||
    runtime.requests.some(
      (request) =>
        request.first_party === true || request.forbidden_external === true,
    );
  must(
    !runtimeFailed ||
      !run.checks.some(
        (c) =>
          c.result === "PASS" &&
          !reviewCheckIds(current.contract).includes(c.id),
      ),
    "machine PASS contradicts recorded runtime/network failure",
  );
  for (const c of run.checks.filter(
    (c) =>
      c.executed &&
      c.result !== "NOT_APPLICABLE" &&
      !reviewCheckIds(current.contract).includes(c.id),
  )) {
    const assertions = c.evidence
      .map((p) => run.artifacts.find((a) => a.path === p))
      .filter((a) => a.kind === "assertions");
    must(assertions.length > 0, "executed check requires assertion evidence");
    for (const a of assertions) {
      const record = read(a);
      must(
        record.id === c.id && record.executed === true,
        "assertion execution/check mismatch",
      );
      must(
        c.result !== "PASS" || !Object.hasOwn(record, "error"),
        "PASS contradicts assertion error evidence",
      );
      for (const [key, value] of Object.entries(binding(run)))
        must(record[key] === value, `stale assertion ${key}`);
    }
  }
  const gated = reviewCheckIds(current.contract);
  const visual = run.checks.filter((c) => gated.includes(c.id));
  for (const check of current.contract.checks.filter((c) => c.method === "state_specific_accessibility_scan_and_triage")) {
    if (run.checks.find((c) => c.id === check.id).result === "PASS")
      must(run.artifacts.some((a) => a.kind === "accessibility"), "accessibility PASS requires scan evidence");
  }
  const manualFindings = accessibilityFindings(root, run);
  if (visual.some((c) => c.result === "PASS")) {
    must(
      object(run.review) &&
        typeof run.review.path === "string" &&
        digest(run.review.sha256),
      "visual pass needs a review record",
    );
    must(
      run.review.path.startsWith(runPrefix(run)),
      "review outside current run directory",
    );
    const bytes =
      reviewBytes ??
      fs.readFileSync(containedArtifact(root, run.review.path, run));
    must(sha(bytes) === run.review.sha256, "review record hash mismatch");
    must(validateReview(JSON.parse(bytes), run, manualFindings), "unresolved review findings or manual accessibility checks");
  }
  if (
    visual.some((c) => c.result === "PASS") ||
    run.checks
      .filter((c) => !gated.includes(c.id))
      .every((c) => ["PASS", "NOT_APPLICABLE"].includes(c.result))
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
  const requiredImages = run.artifacts.filter(
    (a) =>
      a.kind === "image" &&
      current.contract.capture_inventory.some(
        (c) => c.state === a.state && c.width === a.width,
      ),
  );
  const hashes = new Map();
  for (const image of requiredImages)
    hashes.set(image.sha256, [
      ...(hashes.get(image.sha256) || []),
      image.state,
    ]);
  for (const states of hashes.values())
    if (states.length > 1) {
      must(
        (current.contract.capture_equivalence_groups || []).some((group) =>
          states.every((state) => group.includes(state)),
        ),
        "undeclared duplicate required capture bytes",
      );
    }
  const selected = run.checks.filter(
    (c) => !machineOnly || !gated.includes(c.id),
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
