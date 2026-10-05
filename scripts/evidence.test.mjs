import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { spawnSync } from "node:child_process";
import {
  aggregate,
  identity,
  artifact,
  sha,
  validateReview,
  binding,
  validateContract,
  safeFile,
  accessibilityFindingId,
  accessibilityFindings,
} from "./evidence.mjs";
import { relativeEvidencePath } from "./evidence-path.mjs";
// Tiny valid unfiltered RGBA PNGs: real image bytes, no browser-execution claim.
function png(width, color = 0) {
  const chunk = (type, data) => {
    const out = Buffer.alloc(data.length + 12);
    out.writeUInt32BE(data.length);
    out.write(type, 4);
    data.copy(out, 8);
    let crc = 0xffffffff;
    for (const byte of out.subarray(4, -4)) {
      crc ^= byte;
      for (let i = 0; i < 8; i++)
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    out.writeUInt32BE((crc ^ 0xffffffff) >>> 0, out.length - 4);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(1, 4);
  header[8] = 8;
  header[9] = 6;
  const pixels = Buffer.alloc(1 + width * 4, color);
  pixels[0] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
function refreshInventory(f) {
  const a = f.run.artifacts.find((a) => a.kind === "inventory");
  fs.writeFileSync(
    path.join(f.root, a.path),
    JSON.stringify(
      f.run.artifacts
        .filter((a) => a.kind === "image")
        .map(({ path, sha256, state, width }) => ({
          path,
          sha256,
          state,
          width,
        })),
    ),
  );
  a.sha256 = sha(fs.readFileSync(path.join(f.root, a.path)));
}
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ui-evidence-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "examples/equipment"), { recursive: true });
  fs.mkdirSync(path.join(root, "artifacts/ui-runs/test-run-123"), {
    recursive: true,
  });
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
  const prefix = "artifacts/ui-runs/test-run-123/";
  const save = (name, data, kind) => {
    const rel = prefix + name;
    fs.writeFileSync(path.join(root, rel), JSON.stringify(data));
    const a = artifact(root, rel, run, kind);
    run.artifacts.push(a);
    return rel;
  };
  for (const capture of current.contract.capture_inventory) {
    const rel = `${prefix}${capture.state}.png`;
    fs.writeFileSync(
      path.join(root, rel),
      png(
        capture.width,
        current.contract.capture_inventory.indexOf(capture) + 1,
      ),
    );
    run.artifacts.push({ ...artifact(root, rel, run, "image"), ...capture });
  }
  run.checks = current.contract.checks.map(({ id, method }) => ({
    id,
    result: method === "independent_actual_image_review" ? "BLOCKED" : "PASS",
    reason: "unit fixture",
    executed: method !== "independent_actual_image_review",
    evidence:
      method === "independent_actual_image_review"
        ? []
        : [
            save(
              `${id}.json`,
              { id, executed: true, ...binding(run) },
              "assertions",
            ),
          ],
  }));
  // A shared additional artifact tests task evidence changes; not a check execution.
  save("assertions.json", {}, "notes");
  save("axe-scans.json", [], "accessibility");
  save(
    "runtime-network.json",
    {
      runtime_errors: [],
      requests: [],
      served_build_identity: run.source_hash,
      served: [
        {
          path: "/examples/equipment/index.html",
          sha256: current.source.find((x) => x.path.endsWith("index.html"))
            .sha256,
          build: run.source_hash,
        },
      ],
    },
    "runtime",
  );
  save(
    "capture-inventory.json",
    run.artifacts
      .filter((a) => a.kind === "image")
      .map(({ path, sha256, state, width }) => ({
        path,
        sha256,
        state,
        width,
      })),
    "inventory",
  );
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
        path.join(f.root, "artifacts/ui-runs/test-run-123/assertions.json"),
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
  reject(
    t,
    (f) => (f.run.artifacts[0].path = "../elsewhere"),
    /unsafe|outside current run/,
  ));
test("absolute path rejected", (t) =>
  reject(
    t,
    (f) => (f.run.artifacts[0].path = "/tmp/file"),
    /unsafe|outside current run/,
  ));
test("symlink rejected even if target is inside artifact directory", (t) =>
  reject(
    t,
    (f) => {
      fs.symlinkSync(
        "assertions.json",
        path.join(f.root, "artifacts/ui-runs/test-run-123/link"),
      );
      f.run.artifacts[0].path = "artifacts/ui-runs/test-run-123/link";
    },
    /symlink/,
  ));
test("visual cannot be passed by summary or image alone", (t) =>
  reject(
    t,
    (f) => {
      f.run.checks.at(-1).result = "PASS";
      f.run.checks.at(-1).executed = true;
      f.run.checks.at(-1).evidence = [f.run.artifacts[0].path];
      f.run.result = "PASS";
    },
    /review record/,
  ));
test("valid review record can compute full pass (does not authenticate reviewer)", (t) => {
  const f = fixture(t),
    r = review(f.run);
  fs.writeFileSync(
    path.join(f.root, "artifacts/ui-runs/test-run-123/review.json"),
    JSON.stringify(r),
  );
  f.run.review = {
    path: "artifacts/ui-runs/test-run-123/review.json",
    sha256: sha(
      fs.readFileSync(
        path.join(f.root, "artifacts/ui-runs/test-run-123/review.json"),
      ),
    ),
  };
  f.run.checks.at(-1).result = "PASS";
  f.run.checks.at(-1).executed = true;
  f.run.checks.at(-1).evidence = [f.run.artifacts[0].path];
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
  state: "queue-390",
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
test("review gate follows method after check ID rename", (t) => {
  const f = fixture(t),
    p = path.join(f.root, "examples/equipment/acceptance.json");
  const old = f.current.contract.checks.at(-1).id;
  f.current.contract.checks.at(-1).id = "RENAMED-REVIEW";
  fs.writeFileSync(p, JSON.stringify(f.current.contract));
  const current = identity(f.root);
  f.run.contract_hash = current.contract_hash;
  for (const a of f.run.artifacts) {
    a.contract_hash = current.contract_hash;
    if (a.kind === "assertions") {
      const data = JSON.parse(fs.readFileSync(path.join(f.root, a.path)));
      data.contract_hash = current.contract_hash;
      fs.writeFileSync(path.join(f.root, a.path), JSON.stringify(data));
      a.sha256 = sha(fs.readFileSync(path.join(f.root, a.path)));
    }
  }
  f.run.checks.find((c) => c.id === old).id = "RENAMED-REVIEW";
  assert.equal(
    aggregate(f.root, f.run, current, { machineOnly: true }).result,
    "PASS",
  );
  f.run.checks.at(-1).result = "PASS";
  f.run.checks.at(-1).executed = true;
  f.run.checks.at(-1).evidence = [f.run.artifacts[0].path];
  f.run.result = "PASS";
  assert.throws(() => aggregate(f.root, f.run, current), /review record/);
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
  f.run.artifacts.forEach((a) => {
    a.contract_hash = current.contract_hash;
    if (a.kind === "assertions") {
      const data = JSON.parse(fs.readFileSync(path.join(f.root, a.path)));
      data.contract_hash = current.contract_hash;
      fs.writeFileSync(path.join(f.root, a.path), JSON.stringify(data));
      a.sha256 = sha(fs.readFileSync(path.join(f.root, a.path)));
    }
  });
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
    /required capture|inventory/,
  ));
test("duplicate required state image rejected", (t) =>
  reject(
    t,
    (f) => {
      const a = f.run.artifacts.find((x) => x.kind === "image");
      fs.copyFileSync(
        path.join(f.root, a.path),
        path.join(f.root, "artifacts/ui-runs/test-run-123/copy.png"),
      );
      f.run.artifacts.push({
        ...a,
        path: "artifacts/ui-runs/test-run-123/copy.png",
      });
    },
    /required capture|inventory/,
  ));

for (const field of [
  "capture_inventory",
  "integration_mode",
  "change_policy",
  "limitations",
])
  test(`missing required contract ${field} rejected`, (t) => {
    const f = fixture(t);
    delete f.current.contract[field];
    assert.throws(
      () => validateContract(f.current.contract),
      /malformed|inventory/,
    );
  });
test("empty or duplicate required capture declarations rejected", (t) => {
  const f = fixture(t);
  f.current.contract.capture_inventory = [];
  assert.throws(() => validateContract(f.current.contract), /inventory/);
  f.current.contract.capture_inventory = [
    { state: "one", width: 390 },
    { state: "one", width: 390 },
  ];
  assert.throws(() => validateContract(f.current.contract), /inventory/);
});
test("dropping independent review method rejected", (t) => {
  const f = fixture(t);
  f.current.contract.checks.pop();
  assert.throws(() => validateContract(f.current.contract), /independent/);
});
test("non-image bytes cannot satisfy required capture", (t) =>
  reject(
    t,
    (f) => {
      const a = f.run.artifacts[0];
      fs.writeFileSync(path.join(f.root, a.path), "{}");
      a.sha256 = sha("{}");
    },
    /must be PNG/,
  ));
test("PNG encoded width must match capture width", (t) =>
  reject(
    t,
    (f) => {
      const a = f.run.artifacts[0];
      fs.writeFileSync(path.join(f.root, a.path), png(a.width + 1));
      a.sha256 = sha(fs.readFileSync(path.join(f.root, a.path)));
    },
    /dimensions/,
  ));
test("corrupted PNG cannot count as image", (t) =>
  reject(
    t,
    (f) => {
      const a = f.run.artifacts[0],
        bytes = fs.readFileSync(path.join(f.root, a.path));
      bytes[bytes.length - 1] ^= 1;
      fs.writeFileSync(path.join(f.root, a.path), bytes);
      a.sha256 = sha(bytes);
    },
    /checksum/,
  ));
test("distinct captures cannot silently reuse identical PNG bytes", (t) =>
  reject(
    t,
    (f) => {
      const [a, b] = f.run.artifacts;
      fs.copyFileSync(path.join(f.root, a.path), path.join(f.root, b.path));
      b.sha256 = a.sha256;
      refreshInventory(f);
    },
    /undeclared duplicate/,
  ));
test("contract-declared equivalent captures may have identical actual pixels", (t) => {
  const f = fixture(t),
    [a, b] = f.run.artifacts;
  f.current.contract.capture_equivalence_groups = [[a.state, b.state]];
  fs.copyFileSync(path.join(f.root, a.path), path.join(f.root, b.path));
  b.sha256 = a.sha256;
  refreshInventory(f);
  assert.equal(
    aggregate(f.root, f.run, f.current, { machineOnly: true }).result,
    "PASS",
  );
});
for (const groups of [
  [["unknown", "detail-390"]],
  [["detail-390", "detail-1440"]],
  [["detail-390", "detail-390"]],
  [
    ["detail-390", "queue-390"],
    ["detail-390", "pending-390"],
  ],
  [[]],
])
  test(`invalid equivalence groups rejected: ${JSON.stringify(groups)}`, (t) => {
    const f = fixture(t);
    f.current.contract.capture_equivalence_groups = groups;
    assert.throws(() => validateContract(f.current.contract), /equivalence/);
  });
test("current capture inventory cannot alias one image under two names", (t) =>
  reject(
    t,
    (f) => {
      f.run.artifacts[1].path = f.run.artifacts[0].path;
    },
    /artifact inventory/,
  ));
test("another run directory cannot supply evidence", (t) =>
  reject(
    t,
    (f) => {
      const a = f.run.artifacts[0];
      const rel = a.path.replace("test-run-123", "old-run");
      fs.mkdirSync(path.dirname(path.join(f.root, rel)), { recursive: true });
      fs.copyFileSync(path.join(f.root, a.path), path.join(f.root, rel));
      a.path = rel;
    },
    /outside current run/,
  ));
test("editing source and rebinding only run metadata still rejects old artifact content", (t) => {
  const f = fixture(t);
  fs.writeFileSync(
    path.join(f.root, "examples/equipment/index.html"),
    "changed",
  );
  const current = identity(f.root);
  f.run.source_hash = current.source_hash;
  f.run.artifact.working_tree_or_build_hash = current.source_hash;
  f.run.provenance.served_build_identity = current.source_hash;
  f.run.artifacts.forEach((a) => (a.source_hash = current.source_hash));
  assert.throws(() => aggregate(f.root, f.run, current), /stale runtime/);
});
test("old served-file hashes rejected after runtime identity rebind", (t) => {
  const f = fixture(t);
  const a = f.run.artifacts.find((a) => a.kind === "runtime");
  const content = JSON.parse(fs.readFileSync(path.join(f.root, a.path)));
  content.served[0].sha256 = "a".repeat(64);
  fs.writeFileSync(path.join(f.root, a.path), JSON.stringify(content));
  a.sha256 = sha(fs.readFileSync(path.join(f.root, a.path)));
  assert.throws(() => aggregate(f.root, f.run, f.current), /served-file/);
});
test("capture inventory bytes must match actual image inventory", (t) =>
  reject(
    t,
    (f) => {
      const a = f.run.artifacts.find((a) => a.kind === "inventory"),
        data = JSON.parse(fs.readFileSync(path.join(f.root, a.path)));
      data[0].sha256 = "a".repeat(64);
      fs.writeFileSync(path.join(f.root, a.path), JSON.stringify(data));
      a.sha256 = sha(fs.readFileSync(path.join(f.root, a.path)));
    },
    /capture inventory/,
  ));
test("assertion payload binding cannot be rebased only in run metadata", (t) =>
  reject(
    t,
    (f) => {
      const a = f.run.artifacts.find((a) => a.kind === "assertions"),
        data = JSON.parse(fs.readFileSync(path.join(f.root, a.path)));
      data.source_hash = "a".repeat(64);
      fs.writeFileSync(path.join(f.root, a.path), JSON.stringify(data));
      a.sha256 = sha(fs.readFileSync(path.join(f.root, a.path)));
    },
    /stale assertion/,
  ));
for (const filename of ["acceptance.json", "fixtures.json"])
  test(`nested ${filename} changes invalidate source`, (t) => {
    const f = fixture(t);
    fs.mkdirSync(path.join(f.root, "examples/equipment/nested"));
    const p = path.join(f.root, "examples/equipment/nested", filename);
    fs.writeFileSync(p, "{}");
    const before = identity(f.root);
    fs.writeFileSync(p, "changed");
    assert.notEqual(identity(f.root).source_hash, before.source_hash);
  });
test("short safe run ID accepted consistently with schema", (t) => {
  const f = fixture(t);
  f.run.run_id = "x";
  fs.renameSync(
    path.join(f.root, "artifacts/ui-runs/test-run-123"),
    path.join(f.root, "artifacts/ui-runs/x"),
  );
  for (const a of f.run.artifacts) {
    a.run_id = "x";
    a.path = a.path.replace("test-run-123", "x");
    if (a.kind === "assertions") {
      const data = JSON.parse(fs.readFileSync(path.join(f.root, a.path)));
      data.run_id = "x";
      fs.writeFileSync(path.join(f.root, a.path), JSON.stringify(data));
      a.sha256 = sha(fs.readFileSync(path.join(f.root, a.path)));
    }
  }
  for (const c of f.run.checks)
    c.evidence = c.evidence.map((p) => p.replace("test-run-123", "x"));
  refreshInventory(f);
  assert.equal(aggregate(f.root, f.run, f.current).result, "BLOCKED");
});
test("non RFC3339 execution timestamp rejected", (t) =>
  reject(t, (f) => (f.run.execution_started_at = "2026"), /timestamps/));
test("non RFC3339 review timestamp rejected", (t) => {
  const f = fixture(t),
    r = review(f.run);
  r.reviewed_at = "2026";
  assert.throws(() => validateReview(r, f.run), /time/);
});
test("resolved major finding cannot cite nonexistent evidence", (t) => {
  const f = fixture(t),
    r = review(f.run);
  r.findings = [
    {
      ...finding,
      disposition: "resolved",
      resolution: "fixed",
      resolution_evidence: ["artifacts/nonexistent"],
    },
  ];
  assert.throws(() => validateReview(r, f.run), /current-artifact/);
});
test("resolved major finding may cite relevant current image without a code change", (t) => {
  const f = fixture(t),
    r = review(f.run);
  r.findings = [
    {
      ...finding,
      disposition: "resolved",
      resolution: "Reassessment of the current image shows the original clipping report was mistaken",
      resolution_evidence: [f.run.artifacts.find((a) => a.state === finding.state).path],
    },
  ];
  assert.equal(validateReview(r, f.run), true);
});
test("early launch failure with no images remains honestly BLOCKED", (t) => {
  const f = fixture(t);
  f.run.artifacts = f.run.artifacts.filter(
    (a) => !["image", "assertions"].includes(a.kind),
  );
  for (const c of f.run.checks) {
    c.result = "BLOCKED";
    c.executed = false;
    c.evidence = [];
  }
  refreshInventory(f);
  assert.equal(aggregate(f.root, f.run, f.current).result, "BLOCKED");
});
test("failed review import preserves original run and permits retry", (t) => {
  const f = fixture(t),
    rel = "artifacts/ui-runs/test-run-123/run.json",
    p = path.join(f.root, rel),
    input = path.join(f.root, "review-input.json");
  // Other deterministic checks are blocked so the initial aggregate permits partial capture inventory.
  for (const c of f.run.checks) {
    c.result = "BLOCKED";
    c.executed = false;
    c.evidence = [];
  }
  f.run.artifacts = f.run.artifacts.filter(
    (a) => a.state !== f.current.contract.capture_inventory[0].state,
  );
  refreshInventory(f);
  fs.writeFileSync(p, JSON.stringify(f.run));
  const original = fs.readFileSync(p);
  fs.writeFileSync(input, JSON.stringify(review(f.run)));
  const cli = new URL("./evidence-cli.mjs", import.meta.url).pathname;
  const result = spawnSync(
    process.execPath,
    [cli, "review", rel, "review-input.json"],
    { cwd: f.root, encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /required capture/);
  assert.deepEqual(fs.readFileSync(p), original);
  assert.equal(
    fs.existsSync(path.join(path.dirname(p), "independent-review.json")),
    false,
  );
  const capture = f.current.contract.capture_inventory[0],
    image = `artifacts/ui-runs/test-run-123/${capture.state}.png`;
  f.run.artifacts.push({
    ...artifact(f.root, image, f.run, "image"),
    ...capture,
  });
  refreshInventory(f);
  fs.writeFileSync(p, JSON.stringify(f.run));
  fs.writeFileSync(input, JSON.stringify(review(f.run)));
  const retry = spawnSync(
    process.execPath,
    [cli, "review", rel, "review-input.json"],
    { cwd: f.root, encoding: "utf8" },
  );
  assert.equal(retry.status, 1);
  assert.equal(JSON.parse(fs.readFileSync(p)).checks.at(-1).result, "PASS");
  assert.equal(
    fs.existsSync(path.join(path.dirname(p), "independent-review.json")),
    true,
  );
});

test("impossible calendar timestamp rejected", (t) =>
  reject(
    t,
    (f) => {
      f.run.execution_started_at = "2026-02-30T00:00:00Z";
    },
    /timestamps/,
  ));

function mutateRecord(f, kind, update) {
  const a = f.run.artifacts.find((a) => a.kind === kind);
  const data = JSON.parse(fs.readFileSync(path.join(f.root, a.path)));
  update(data);
  fs.writeFileSync(path.join(f.root, a.path), JSON.stringify(data));
  a.sha256 = sha(fs.readFileSync(path.join(f.root, a.path)));
}
test("recorded assertion failure cannot be represented as PASS after updating hash", (t) =>
  reject(
    t,
    (f) =>
      mutateRecord(
        f,
        "assertions",
        (record) =>
          (record.error = "AssertionError: expected return to succeed"),
      ),
    /PASS contradicts assertion error/,
  ));
test("empty error field cannot masquerade as successful assertion", (t) =>
  reject(
    t,
    (f) => mutateRecord(f, "assertions", (record) => (record.error = "")),
    /PASS contradicts assertion error/,
  ));
test("recorded assertion failure remains honest FAIL", (t) => {
  const f = fixture(t);
  mutateRecord(
    f,
    "assertions",
    (record) => (record.error = "AssertionError: return failed"),
  );
  f.run.checks[0].result = "FAIL";
  f.run.result = "FAIL";
  assert.equal(
    aggregate(f.root, f.run, f.current, { machineOnly: true }).result,
    "FAIL",
  );
});
for (const [name, update] of [
  [
    "runtime exception",
    (log) => log.runtime_errors.push({ message: "Unhandled exception" }),
  ],
  [
    "prohibited external request",
    (log) =>
      log.requests.push({
        forbidden_external: true,
        url: "https://external.invalid",
      }),
  ],
  [
    "first-party request failure",
    (log) =>
      log.requests.push({ first_party: true, error: "connection failed" }),
  ],
])
  test(`machine PASS contradicting ${name} rejected even with correct content hash`, (t) =>
    reject(
      t,
      (f) => mutateRecord(f, "runtime", update),
      /machine PASS contradicts/,
    ));
for (const outcome of ["FAIL", "BLOCKED"])
  test(`runtime failure preserves honest ${outcome}`, (t) => {
    const f = fixture(t);
    mutateRecord(f, "runtime", (log) =>
      log.runtime_errors.push({ message: "launch failed" }),
    );
    for (const c of f.run.checks.filter((c) => c.id !== "VISUAL-01")) {
      c.result = outcome;
      if (outcome === "BLOCKED") {
        c.executed = false;
        c.evidence = [];
      }
    }
    f.run.result = outcome;
    assert.equal(
      aggregate(f.root, f.run, f.current, { machineOnly: true }).result,
      outcome,
    );
  });
test("schema-required review must exist even before independent review", (t) =>
  reject(t, (f) => delete f.run.review, /required review field/));
for (const value of [{}, "pending", false, { path: "review", sha256: "bad" }])
  test(`malformed BLOCKED review field rejected: ${JSON.stringify(value)}`, (t) =>
    reject(t, (f) => (f.run.review = value), /required review field/));

test("authorized not-applicable checks retain disposition with runtime diagnostics", (t) => {
  const f = fixture(t);
  mutateRecord(f, "runtime", (log) =>
    log.requests.push({
      forbidden_external: true,
      url: "https://external.invalid",
    }),
  );
  for (const c of f.run.checks.filter(
    (c) =>
      f.current.contract.checks.find((definition) => definition.id === c.id)
        .method !== "independent_actual_image_review",
  )) {
    f.current.contract.policy.not_applicable[c.id] = {
      condition: "explicit unit policy condition",
      rationale: "Not executed under the frozen test policy",
    };
    c.result = "NOT_APPLICABLE";
    c.executed = false;
    c.evidence = [];
    c.applicability_condition = "explicit unit policy condition";
    c.reason = "Not executed under the frozen test policy";
  }
  assert.equal(
    aggregate(f.root, f.run, f.current, { machineOnly: true }).result,
    "PASS",
  );
  assert.equal(aggregate(f.root, f.run, f.current).result, "BLOCKED");
  assert.equal(f.run.checks[0].result, "NOT_APPLICABLE");
});

function manualFixture(t) {
  const f = fixture(t), image = f.run.artifacts.find((a) => a.state === finding.state);
  const target = [".loan-returned .status-icon"];
  const finding_id = accessibilityFindingId(image.state, image.width, "color-contrast", target);
  mutateRecord(f, "accessibility", (scans) => scans.push({
    state: image.state, width: image.width, capture: image.path, violations: [],
    incomplete: [{id: "color-contrast", nodes: [{target, finding_id}]}],
  }));
  return {...f, finding_id};
}
function submitReview(f, r) {
  const rel = `artifacts/ui-runs/${f.run.run_id}/independent-review.json`;
  const bytes = Buffer.from(JSON.stringify(r));
  fs.writeFileSync(path.join(f.root, rel), bytes);
  f.run.review = {path: rel, sha256: sha(bytes)};
  const check = f.run.checks.find((c) => c.id === "VISUAL-01");
  Object.assign(check, {result: "PASS", executed: true, evidence: r.images.map((a) => a.path)});
  f.run.result = "PASS";
}
test("missing manual triage rejects full PASS but machine zero-violation scope stays PASS", (t) => {
  const f = manualFixture(t);
  assert.equal(aggregate(f.root, f.run, f.current, {machineOnly:true}).result, "PASS");
  assert.equal(aggregate(f.root, f.run, f.current).result, "BLOCKED");
  submitReview(f, review(f.run));
  assert.throws(() => aggregate(f.root, f.run, f.current), /manual accessibility finding/);
});
test("each manual node requires exact identity, explicit disposition and rationale", (t) => {
  const f = manualFixture(t), expected = accessibilityFindings(f.root, f.run), r = review(f.run);
  r.accessibility_triage = [{finding_id:f.finding_id, disposition:"accepted", rationale:"Synthetic test judgment only"}];
  assert.equal(validateReview(r, f.run, expected), true);
  submitReview(f, r);
  assert.equal(aggregate(f.root, f.run, f.current).result, "PASS");
  r.accessibility_triage[0].disposition = "open";
  assert.equal(validateReview(r, f.run, expected), false);
  submitReview(f, r);
  assert.throws(() => aggregate(f.root, f.run, f.current), /unresolved review/);
  for (const mutation of [
    (x) => x.accessibility_triage[0].rationale = " ",
    (x) => x.accessibility_triage[0].finding_id = "wrong-node",
    (x) => x.accessibility_triage.push({...x.accessibility_triage[0]}),
  ]) {
    const invalid = structuredClone(r); mutation(invalid);
    assert.throws(() => validateReview(invalid, f.run, expected), /manual accessibility finding/);
  }
});
test("manual identity is stable across node ordering and changes with capture/rule/target", () => {
  const args = ["queue-390",390,"color-contrast",[".status-icon"]];
  const id = accessibilityFindingId(...args);
  assert.equal(accessibilityFindingId(...structuredClone(args)), id);
  for (const [index,value] of [[0,"detail-390"],[1,768],[2,"label"],[3,[".other-icon"]]]) {
    const changed = structuredClone(args); changed[index]=value;
    assert.notEqual(accessibilityFindingId(...changed),id);
  }
});
test("manual accessibility metadata cannot point to unrelated capture or spoof a node ID", (t) => {
  for (const mutation of [
    (scans) => scans[0].capture = "runtime-network.json",
    (scans) => scans[0].incomplete[0].nodes[0].finding_id = "spoofed",
    (scans) => scans[0].incomplete[0].nodes[0].target = [null],
  ]) {
    const f = manualFixture(t); mutateRecord(f,"accessibility",mutation);
    assert.throws(() => aggregate(f.root,f.run,f.current), /capture|identity|target/);
  }
});
test("resolved visual finding rejects runtime JSON and unrelated state images", (t) => {
  const f = fixture(t), r = review(f.run);
  for (const a of [f.run.artifacts.find((a)=>a.kind==="runtime"),f.run.artifacts.find((a)=>a.kind==="image" && a.state!==finding.state)]) {
    r.findings=[{...finding,disposition:"resolved",resolution:"Reassessed",resolution_evidence:[a.path]}];
    assert.throws(() => validateReview(r,f.run), /state\/capture scope/);
  }
});
test("unknown state or capture rejects even an open finding", (t) => {
  const f = fixture(t), r = review(f.run);
  for (const extra of [{state:"unknown"},{capture:f.run.artifacts.find((a)=>a.kind==="runtime").path},{state:"global"}]) {
    r.findings=[{...finding,...extra}];
    assert.throws(() => validateReview(r,f.run), /state\/capture/);
  }
});
test("explicit global finding resolves only with all current images", (t) => {
  const f=fixture(t),r=review(f.run);
  r.findings=[{...finding,scope:"global",state:"global",disposition:"resolved",resolution:"Independent reassessment",resolution_evidence:r.images.map((a)=>a.path)}];
  assert.equal(validateReview(r,f.run),true);
  r.findings[0].resolution_evidence.pop();
  assert.throws(()=>validateReview(r,f.run), /state\/capture scope/);
});
test("additional_widths required and positive-integer array matches schema", (t) => {
  const f=fixture(t);
  const schema=JSON.parse(fs.readFileSync(new URL("../contracts/ui-acceptance.schema.json",import.meta.url)));
  assert.ok(schema.required.includes("additional_widths"));
  assert.deepEqual(schema.properties.additional_widths,{type:"array",items:{type:"integer",minimum:1}});
  for (const value of [undefined,null,"320",{},[0],[-1],[1.5],["320"]]) {
    const c=structuredClone(f.current.contract); c.additional_widths=value;
    assert.throws(()=>validateContract(c),/additional_widths/);
  }
  for (const value of [[],[320,390]]) {
    const c=structuredClone(f.current.contract);c.additional_widths=value;
    assert.doesNotThrow(()=>validateContract(c));
  }
});
test("capture state names must be globally unique before state equivalence lookup", (t) => {
  const f=fixture(t),c=structuredClone(f.current.contract);
  c.capture_inventory.push({...c.capture_inventory[0],width:777});
  assert.throws(()=>validateContract(c),/capture inventory/);
});
test("Windows native relative paths normalize to POSIX while traversal remains rejected", (t) => {
  const f=fixture(t), target="C:\\workspace\\artifacts\\ui-runs\\test\\run.json";
  assert.equal(relativeEvidencePath("C:\\workspace",target,path.win32),"artifacts/ui-runs/test/run.json");
  const outside=relativeEvidencePath("C:\\workspace","C:\\outside\\run.json",path.win32);
  assert.equal(outside,"../outside/run.json");
  assert.throws(()=>safeFile(f.root,outside),/unsafe evidence path/);
  const differentDrive=relativeEvidencePath("C:\\workspace","D:\\outside\\run.json",path.win32);
  assert.match(differentDrive,/^D:/);
  assert.throws(()=>safeFile(f.root,differentDrive));
});
